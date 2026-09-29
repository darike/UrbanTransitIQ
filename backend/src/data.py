"""Cached read-only access to the Parquet analytics layer.

trips_enriched (504k rows, needed columns only) is loaded once per process so
every dashboard endpoint can apply the shared filters server-side and still
answer well inside the 5-second SRS budget.
"""

import json
import os
from functools import lru_cache

import pandas as pd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PQ = os.path.join(ROOT, "parquet_data")
REPORTS = os.path.join(ROOT, "reports")
RAW = os.path.join(ROOT, "raw_data")

ENRICHED_COLS = ["trip_id", "route_id", "direction", "sched_departure", "delay_min",
                 "occupancy_pct", "boarded", "dep_hour", "day_of_week", "is_weekend",
                 "is_peak", "vehicle_id", "actual_travel_min", "sched_travel_min"]


@lru_cache(maxsize=None)
def enriched() -> pd.DataFrame:
    df = pd.read_parquet(os.path.join(PQ, "trips_enriched.parquet"), columns=ENRICHED_COLS)
    df["sched_departure"] = pd.to_datetime(df["sched_departure"])
    return df


@lru_cache(maxsize=None)
def parquet(name: str) -> pd.DataFrame:
    return pd.read_parquet(os.path.join(PQ, f"{name}.parquet"))


@lru_cache(maxsize=None)
def raw_csv(name: str) -> pd.DataFrame:
    return pd.read_csv(os.path.join(RAW, f"{name}.csv"))


@lru_cache(maxsize=None)
def report(name: str) -> dict:
    with open(os.path.join(REPORTS, f"{name}.json"), encoding="utf-8") as f:
        return json.load(f)


def apply_filters(df: pd.DataFrame, route_id=None, direction=None, peak=None,
                  date_from=None, date_to=None, days=None) -> pd.DataFrame:
    if route_id:
        df = df[df["route_id"] == route_id]
    if direction in ("inbound", "outbound"):
        df = df[df["direction"] == direction]
    if peak == "peak":
        df = df[df["is_peak"] == 1]
    elif peak == "offpeak":
        df = df[df["is_peak"] == 0]
    elif peak == "weekend":
        df = df[df["is_weekend"] == 1]
    if days:
        cutoff = df["sched_departure"].max() - pd.Timedelta(days=int(days))
        df = df[df["sched_departure"] >= cutoff]
    if date_from:
        df = df[df["sched_departure"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["sched_departure"] <= pd.Timestamp(date_to)]
    return df
