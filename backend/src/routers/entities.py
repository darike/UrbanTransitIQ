"""Entity browsing (routes, stops, vehicles, trips) — paginated + filterable."""

from fastapi import APIRouter, Depends, Query

from backend.src.data import apply_filters, enriched, parquet, raw_csv
from backend.src.deps import current_user

router = APIRouter(dependencies=[Depends(current_user)])


def paginate(df, page: int, size: int):
    total = len(df)
    rows = df.iloc[(page - 1) * size: page * size]
    return {"total": total, "page": page, "size": size, "rows": rows.to_dict("records")}


@router.get("/routes")
def routes(page: int = 1, size: int = Query(25, le=200), q: str = None):
    df = parquet("route_stats")
    if q:
        df = df[df["route_id"].str.contains(q, case=False) |
                df["route_name"].str.contains(q, case=False)]
    return paginate(df.round(1), page, size)


@router.get("/stops")
def stops(page: int = 1, size: int = Query(25, le=500), zone: str = None):
    df = parquet("stop_stats")
    if zone:
        df = df[df["zone"] == zone]
    return paginate(df.sort_values("boardings", ascending=False), page, size)


@router.get("/vehicles")
def vehicles(page: int = 1, size: int = Query(25, le=300)):
    return paginate(raw_csv("vehicles"), page, size)


@router.get("/trips")
def trips(page: int = 1, size: int = Query(25, le=200), route_id: str = None,
          direction: str = None, peak: str = None, days: int = None):
    df = apply_filters(enriched(), route_id=route_id, direction=direction,
                       peak=peak, days=days)
    df = df.sort_values("sched_departure", ascending=False)
    out = df[["trip_id", "route_id", "direction", "sched_departure", "delay_min",
              "occupancy_pct", "vehicle_id"]].copy()
    out["sched_departure"] = out["sched_departure"].astype(str)
    return paginate(out.round(1), page, size)
