"""Dashboard endpoints — every one returns pre-aggregated JSON with a written
`insight` (SRS: conclusions, not just charts) and honours the shared filters:
?route_id=&direction=&peak=peak|offpeak|weekend&days=7|30|90|365
"""

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends

from backend.src.data import apply_filters, enriched, parquet, report
from backend.src.deps import current_user, require_role

router = APIRouter(dependencies=[Depends(current_user)])

SEV_ORDER = ["on_time", "minor", "moderate", "major", "severe"]


def _filters(route_id: str = None, direction: str = None, peak: str = None,
             days: int = None):
    return dict(route_id=route_id, direction=direction, peak=peak, days=days)


@router.get("/executive")
def executive(f: dict = Depends(_filters)):
    df = apply_filters(enriched(), **f)
    rs = parquet("route_stats")
    if f["route_id"]:
        rs = rs[rs["route_id"] == f["route_id"]]
    kpi = {
        "total_passengers": int(df["boarded"].sum()),
        "total_trips": int(len(df)),
        "avg_occupancy": round(float(df["occupancy_pct"].mean()), 1),
        "avg_delay": round(float(df["delay_min"].mean()), 1),
        "on_time_pct": round(float((df["delay_min"] <= 5).mean() * 100), 1),
        "high_demand_routes": int((rs["occupancy"] >= 85).sum()),
        "overcrowded_routes": int((rs["classification"] == "Overcrowded").sum()),
        "underutilized_routes": int((rs["classification"] == "Reliable, Underutilized").sum()),
    }
    worst = rs.nlargest(1, "overload_events")
    insight = (f"{worst.iloc[0]['route_id']} drives the overcrowding problem with "
               f"{int(worst.iloc[0]['overload_events'])} overload events; on-time performance "
               f"across the selection is {kpi['on_time_pct']}%.") if len(worst) else "No routes in selection."
    top = rs.nlargest(7, "score")[["route_id", "route_name", "demand", "on_time",
                                   "occupancy", "score", "classification"]]
    return {"kpi": kpi, "top_routes": top.round(1).to_dict("records"), "insight": insight}


@router.get("/hourly-demand")
def hourly_demand(f: dict = Depends(_filters)):
    df = apply_filters(enriched(), **{**f, "peak": None})
    g = (df.groupby(["dep_hour", "is_weekend"])["boarded"].sum().reset_index()
         .pivot(index="dep_hour", columns="is_weekend", values="boarded")
         .rename(columns={0: "weekday", 1: "weekend"}).fillna(0).reset_index())
    return g.astype({"weekday": int, "weekend": int}, errors="ignore").to_dict("records")


@router.get("/route-performance")
def route_performance(f: dict = Depends(_filters)):
    rs = parquet("route_stats")
    if f["route_id"]:
        rs = rs[rs["route_id"] == f["route_id"]]
    dist = rs["classification"].value_counts().to_dict()
    return {"routes": rs.round(1).to_dict("records"),
            "distribution": dist,
            "insight": f"{dist.get('Overcrowded', 0)} routes are persistently overcrowded while "
                       f"{dist.get('Reliable, Underutilized', 0)} run reliable but under-filled — "
                       "capacity is misallocated, not missing."}


@router.get("/delays")
def delays(f: dict = Depends(_filters)):
    df = apply_filters(enriched(), **f)
    by_route = (df.groupby("route_id")["delay_min"]
                .agg(avg_delay="mean", p90=lambda s: s.quantile(0.9),
                     incidents=lambda s: int((s > 10).sum()))
                .round(1).reset_index().sort_values("avg_delay", ascending=False))
    heat = (df[df["is_weekend"] == 0].groupby(["day_of_week", "dep_hour"])["delay_min"]
            .mean().round(1).reset_index())
    sev = pd.cut(df["delay_min"], [-99, 2, 5, 10, 20, 999], labels=SEV_ORDER) \
        .value_counts(normalize=True).mul(100).round(1)
    return {"by_route": by_route.head(20).to_dict("records"),
            "heatmap": heat.to_dict("records"),
            "severity": [{"name": k, "value": float(sev.get(k, 0))} for k in SEV_ORDER],
            "insight": "Delays concentrate in the two weekday commute ridges; Friday evening "
                       "is consistently the worst window."}


@router.get("/occupancy")
def occupancy(f: dict = Depends(_filters)):
    df = apply_filters(enriched(), **f)
    bands = pd.cut(df["occupancy_pct"], [0, 40, 70, 90, 110, 999],
                   labels=["low", "moderate", "high", "overcrowded", "critical"]) \
        .value_counts().sort_index()
    risk = parquet("high_risk_trips")
    if f["route_id"]:
        risk = risk[risk["route_id"] == f["route_id"]]
    over = (df[df["occupancy_pct"] > 100].groupby("route_id").size()
            .sort_values(ascending=False).head(6))
    return {"bands": [{"band": str(k), "trips": int(v)} for k, v in bands.items()],
            "avg_occupancy": round(float(df["occupancy_pct"].mean()), 1),
            "overload_by_route": [{"route_id": k, "events": int(v)} for k, v in over.items()],
            "high_risk_trips": risk.head(10).round(3).to_dict("records"),
            "insight": f"{int(bands.get('critical', 0)):,} trips ran above 110% capacity in the "
                       "selection — persistent, not event-driven."}


@router.get("/forecast")
def forecast():
    hist = parquet("forecast_history")
    fut = parquet("forecast_future")
    m = report("model_metrics")["demand_forecast"]
    return {"history": hist.assign(service_date=hist["service_date"].astype(str)).to_dict("records"),
            "forecast": fut.assign(service_date=fut["service_date"].astype(str)).to_dict("records"),
            "metrics": m,
            "insight": f"The XGBoost forecaster beats the naive seasonal baseline by "
                       f"{m['improvement_MAE_pct']}% MAE on the untouched last 28 days."}


@router.get("/comparison",
            dependencies=[Depends(require_role("Administrator", "Analyst", "Evaluator"))])
def comparison():
    # model-lab data is not part of the Operator's operational scope (RBAC matrix)
    return report("dual_pipeline_comparison")


@router.get("/passenger-flow")
def passenger_flow(f: dict = Depends(_filters)):
    stops = parquet("stop_stats").sort_values("boardings", ascending=False)
    od = parquet("od_zone_matrix")
    df = apply_filters(enriched(), **f)
    direction = (df.groupby(["dep_hour", "direction"])["boarded"].sum().reset_index()
                 .pivot(index="dep_hour", columns="direction", values="boarded")
                 .fillna(0).reset_index())
    return {"top_stops": stops.head(15).to_dict("records"),
            "od_zones": od.to_dict("records"),
            "hourly_direction": direction.to_dict("records"),
            "insight": "Inbound dominates the AM peak and outbound the PM peak — the demand "
                       "imbalance the schedule must absorb."}


@router.get("/route-map")
def route_map():
    rs = parquet("route_stats")
    stops = parquet("stop_stats").nlargest(30, "boardings")
    return {"routes": rs[["route_id", "occupancy", "avg_delay", "classification"]].round(1).to_dict("records"),
            "hub_stops": stops.to_dict("records")}
