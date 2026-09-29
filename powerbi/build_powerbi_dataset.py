"""
Build a Power BI-ready star-schema dataset from the pipeline's Parquet outputs.

Produces clean CSVs in powerbi/data/ that import into Power BI Desktop with
auto-detected relationships:
    fact_trips   (one row per completed trip, sampled to a laptop-friendly size)
    dim_route, dim_stop, dim_date, dim_vehicle
Run:  python powerbi/build_powerbi_dataset.py
"""

import os
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PQ = os.path.join(ROOT, "parquet_data")
RAW = os.path.join(ROOT, "raw_data")
OUT = os.path.join(ROOT, "powerbi", "data")
os.makedirs(OUT, exist_ok=True)

# ---- fact table: sample the enriched trips (Power BI handles 100k easily) ----
cols = ["trip_id", "route_id", "vehicle_id", "direction", "sched_departure",
        "delay_min", "occupancy_pct", "boarded", "dep_hour", "day_of_week",
        "is_weekend", "is_peak"]
trips = pd.read_parquet(os.path.join(PQ, "trips_enriched.parquet"), columns=cols)
if len(trips) > 120_000:
    trips = trips.sample(120_000, random_state=20260928)
trips["sched_departure"] = pd.to_datetime(trips["sched_departure"])
trips["date"] = trips["sched_departure"].dt.date
trips["severity"] = pd.cut(trips["delay_min"], [-99, 2, 5, 10, 20, 999],
                           labels=["On Time", "Minor", "Moderate", "Major", "Severe"])
trips["occ_band"] = pd.cut(trips["occupancy_pct"], [0, 40, 70, 90, 110, 999],
                           labels=["Low", "Moderate", "High", "Overcrowded", "Critical"])
trips.to_csv(os.path.join(OUT, "fact_trips.csv"), index=False)

# ---- dimensions -------------------------------------------------------------
route = pd.read_parquet(os.path.join(PQ, "route_stats.parquet"))
route.to_csv(os.path.join(OUT, "dim_route.csv"), index=False)

pd.read_parquet(os.path.join(PQ, "stop_stats.parquet")).to_csv(
    os.path.join(OUT, "dim_stop.csv"), index=False)

veh = pd.read_csv(os.path.join(RAW, "vehicles.csv"))
veh.to_csv(os.path.join(OUT, "dim_vehicle.csv"), index=False)

# date dimension over the trip range
dates = pd.date_range(trips["sched_departure"].min().normalize(),
                      trips["sched_departure"].max().normalize(), freq="D")
dim_date = pd.DataFrame({"date": dates.date})
dd = pd.to_datetime(dim_date["date"])
dim_date["year"] = dd.dt.year
dim_date["month"] = dd.dt.month
dim_date["month_name"] = dd.dt.strftime("%b %Y")
dim_date["day_name"] = dd.dt.strftime("%a")
dim_date["is_weekend"] = dd.dt.dayofweek >= 5
dim_date.to_csv(os.path.join(OUT, "dim_date.csv"), index=False)

# forecast (history + future) for a Power BI line chart
try:
    h = pd.read_parquet(os.path.join(PQ, "forecast_history.parquet"))
    f = pd.read_parquet(os.path.join(PQ, "forecast_future.parquet"))
    h = h.rename(columns={"demand": "value"}).assign(kind="Actual")
    f = f.rename(columns={"forecast": "value"})[["service_date", "value"]].assign(kind="Forecast")
    pd.concat([h[["service_date", "value", "kind"]], f]).to_csv(
        os.path.join(OUT, "fact_forecast.csv"), index=False)
except Exception as e:
    print("forecast skipped:", e)

print("Power BI dataset written to:", OUT)
for fn in sorted(os.listdir(OUT)):
    n = len(pd.read_csv(os.path.join(OUT, fn)))
    print(f"  {fn:22} {n:>8,} rows")
