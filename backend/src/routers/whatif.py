"""What-if simulator (SRS Steps 48-49) — response-surface over the real
route_stats baseline; every output is labelled an estimate."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.src.data import parquet
from backend.src.deps import current_user

router = APIRouter(dependencies=[Depends(current_user)])


class Scenario(BaseModel):
    route_id: str
    trips_per_hour: float
    vehicle_capacity: int
    demand_change_pct: float = 0


@router.post("/simulate")
def simulate(s: Scenario):
    rs = parquet("route_stats")
    row = rs[rs["route_id"] == s.route_id]
    if row.empty:
        raise HTTPException(404, f"unknown route {s.route_id}")
    r = row.iloc[0]

    # baseline peak-hour demand estimated from real stats
    base_freq = max(60 / r["headway_min"], 1)
    peak_demand = r["demand"] / 363 * 0.14          # ~14% of a day in the peak hour
    demand = peak_demand * (1 + s.demand_change_pct / 100)
    supply = s.trips_per_hour * s.vehicle_capacity

    occupancy = round(min(100 * demand / max(supply, 1), 160), 1)
    wait_min = round(max(60 / (s.trips_per_hour * 2), 1.2) * (1.35 if occupancy > 100 else 1), 1)
    risk = round(1 / (1 + pow(2.71828, -(occupancy - 90) / 7)), 2)
    coverage = round(min(100 * supply / max(demand, 1), 100), 1)

    baseline = {
        "trips_per_hour": round(base_freq, 1),
        "occupancy": round(min(100 * peak_demand / (base_freq * 60), 160), 1),
    }
    return {
        "estimate": True,  # SRS: simulated outputs must be identified as estimates
        "route_id": s.route_id,
        "baseline": baseline,
        "result": {"occupancy_pct": occupancy, "avg_wait_min": wait_min,
                   "crowding_risk": risk, "demand_coverage_pct": coverage,
                   "passengers_per_trip": round(demand / max(s.trips_per_hour, 1))},
        "reading": ("Supply insufficient — add trips or capacity." if occupancy >= 95
                    else "Over-supplied — frequency could be reduced." if occupancy <= 55
                    else "Balanced scenario within comfort bands."),
    }
