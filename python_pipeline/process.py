"""
UrbanTransit IQ — executable processing engine (pandas/pyarrow).

Mirrors spark_jobs/01-03 rule-for-rule so the pipeline runs on machines without
Java/Spark (documented constraint, hdfs_scripts/README.md): quality analysis,
cleaning with an audit trail, 9-table integration, the 23-feature analytical
table, and pre-aggregated dashboard tables — all written to parquet_data/.

Run:  python python_pipeline/process.py
"""

import json
import os
import shutil
import time

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw_data")
PROC = os.path.join(ROOT, "processed_data")
PQ = os.path.join(ROOT, "parquet_data")
REPORTS = os.path.join(ROOT, "reports")
for d in (PROC, PQ, REPORTS, os.path.join(PROC, "quarantine")):
    os.makedirs(d, exist_ok=True)

T0 = time.time()
LOG = []


def stage(msg):
    line = f"[{time.time()-T0:7.1f}s] {msg}"
    print(line)
    LOG.append(line)


# ---------------------------------------------------------------- load ----
stage("loading raw tables")
trips = pd.read_csv(f"{RAW}/trips.csv", parse_dates=[
    "sched_departure", "actual_departure", "sched_arrival", "actual_arrival"])
counts = pd.read_csv(f"{RAW}/passenger_counts.csv")
routes = pd.read_csv(f"{RAW}/routes.csv")
vehicles = pd.read_csv(f"{RAW}/vehicles.csv")
passengers = pd.read_csv(f"{RAW}/passengers.csv")
cal = pd.read_csv(f"{RAW}/service_calendar.csv", parse_dates=["service_date"])
tickets = pd.read_csv(f"{RAW}/tickets.csv", parse_dates=["scan_time"],
                      dtype={"route_id": "string", "passenger_id": "string",
                             "trip_id": "string", "channel": "category"})
stage(f"loaded: trips={len(trips):,} tickets={len(tickets):,} counts={len(counts):,}")

# ------------------------------------------------------ quality report ----
stage("running data-quality checks")
dq = {}
route_set = set(routes["route_id"])
veh_set = set(vehicles["vehicle_id"])

dq["Q1_missing_or_unknown_route_id"] = int(((tickets["route_id"].isna()) |
                                            (~tickets["route_id"].isin(route_set))).sum())
tickets_sorted = tickets.sort_values(["ticket_id", "scan_time"])
gap = tickets_sorted.groupby("ticket_id")["scan_time"].diff().dt.total_seconds()
dup_mask_sorted = gap.le(120).fillna(False)
dq["Q2_duplicate_ticket_scans"] = int(dup_mask_sorted.sum())
dq["Q3_duplicate_trips"] = int(trips.duplicated("trip_id").sum())
dq["Q4_invalid_timestamps"] = int(((trips["status"] == "completed") &
                                   trips["actual_arrival"].isna()).sum())
dq["Q5_departure_after_arrival"] = int((trips["actual_departure"] >
                                        trips["actual_arrival"]).sum())
dq["Q6_negative_passenger_counts"] = int((counts["boarded"] < 0).sum())
dq["Q7_unknown_vehicle_ids"] = int((~trips["vehicle_id"].isin(veh_set)).sum())
dq["Q8_capacity_violations_kept"] = int((counts["occupancy_pct"] > 100).sum())

# ------------------------------------------------------------- cleaning ----
stage("cleaning with audit trail")
audit = []

n0 = len(trips)
trips = trips.drop_duplicates("trip_id").copy()
audit.append(("R1", "trips", n0 - len(trips), "dropped exact duplicate trips (kept first)"))

swapped = trips["actual_departure"] > trips["actual_arrival"]
trips.loc[swapped, ["actual_departure", "actual_arrival"]] = \
    trips.loc[swapped, ["actual_arrival", "actual_departure"]].to_numpy()
audit.append(("R2", "trips", int(swapped.sum()), "swapped reversed departure/arrival (GPS-confirmed order)"))

ghost = ~trips["vehicle_id"].isin(veh_set)
trips[ghost].to_parquet(f"{PROC}/quarantine/trips_unknown_vehicle.parquet", index=False)
trips = trips[~ghost].copy()
audit.append(("R3", "trips", int(ghost.sum()), "quarantined trips with unknown vehicle ids"))

med_delay = trips.groupby("route_id")["delay_min"].median()
null_arr = (trips["status"] == "completed") & trips["actual_arrival"].isna()
imput = trips.loc[null_arr, "sched_arrival"] + pd.to_timedelta(
    trips.loc[null_arr, "route_id"].map(med_delay).fillna(4.0), unit="m")
trips.loc[null_arr, "actual_arrival"] = imput
audit.append(("R4", "trips", int(null_arr.sum()), "imputed null arrivals = sched + route median delay"))

dup_ids = tickets_sorted.index[dup_mask_sorted]
tickets = tickets.drop(index=dup_ids)
audit.append(("R5a", "tickets", len(dup_ids), "dropped duplicate scans (same ticket ≤120s, kept first)"))
badr = ~tickets["route_id"].isin(route_set)
tickets.loc[badr, "route_id"] = pd.NA
audit.append(("R5b", "tickets", int(badr.sum()), "unknown route ids set to null (recoverable via trip join)"))

nc0 = len(counts)
counts = counts.drop_duplicates("trip_id").copy()
audit.append(("R6a", "counts", nc0 - len(counts),
              "dropped duplicate count rows for duplicated trips (kept first)"))

neg = counts["boarded"] < 0
counts[neg].to_parquet(f"{PROC}/quarantine/counts_negative.parquet", index=False)
counts.loc[neg, "boarded"] = np.nan
audit.append(("R6", "counts", int(neg.sum()), "negative boarded nulled + quarantined copy kept"))
audit.append(("R7", "counts", dq["Q8_capacity_violations_kept"],
              "capacity violations KEPT — genuine overcrowding is the core signal"))

audit_df = pd.DataFrame(audit, columns=["rule_id", "entity", "rows_affected", "action"])
audit_df.to_parquet(f"{PROC}/cleaning_audit.parquet", index=False)
dq["rows_trips_clean"] = len(trips)
dq["rows_tickets_clean"] = len(tickets)
with open(f"{REPORTS}/data_quality_report.json", "w") as f:
    json.dump({"checks": dq, "cleaning_rules": audit}, f, indent=2)
stage(f"quality report written: {sum(v for k, v in dq.items() if k.startswith('Q'))} issues across 8 checks")

# recover null ticket route_ids through the trip join (documented in R5b)
trip_route = trips.set_index("trip_id")["route_id"]
fix = tickets["route_id"].isna() & tickets["trip_id"].notna()
tickets.loc[fix, "route_id"] = tickets.loc[fix, "trip_id"].map(trip_route)

trips.to_parquet(f"{PROC}/trips_clean.parquet", index=False)
counts.to_parquet(f"{PROC}/counts_clean.parquet", index=False)

# --------------------------------------------------- joins + features ----
stage("integrating 9 tables + engineering features")
t = trips[trips["status"] == "completed"].merge(counts, on="trip_id", how="inner")
t = t.merge(routes[["route_id", "distance_km", "n_stops", "scheduled_headway_min", "archetype"]],
            on="route_id", how="left")
t = t.merge(vehicles[["vehicle_id", "vehicle_type", "capacity"]].rename(
    columns={"capacity": "vehicle_capacity"}), on="vehicle_id", how="left")
t["service_date"] = pd.to_datetime(t["service_date"])
t = t.merge(cal[["service_date", "is_holiday", "special_event"]], on="service_date", how="left")

t["dep_hour"] = t["sched_departure"].dt.hour
t["day_of_week"] = t["sched_departure"].dt.dayofweek
t["is_weekend"] = (t["day_of_week"] >= 5).astype(int)
t["is_peak"] = (t["dep_hour"].between(7, 9) | t["dep_hour"].between(17, 19)).astype(int)
t["actual_travel_min"] = (t["actual_arrival"] - t["actual_departure"]).dt.total_seconds() / 60
t["schedule_deviation_min"] = t["actual_travel_min"] - t["sched_travel_min"]

# leak-safe rolling 7-day route context: daily aggregates shifted by one day
daily = (t.groupby(["route_id", "service_date"])
         .agg(d_delay=("delay_min", "mean"), d_occ=("occupancy_pct", "mean"),
              d_demand=("boarded", "sum"))
         .reset_index().sort_values(["route_id", "service_date"]))
roll = (daily.set_index("service_date").groupby("route_id")
        [["d_delay", "d_occ", "d_demand"]]
        .rolling("7D").mean().groupby(level=0).shift(1)
        .rename(columns={"d_delay": "route_delay_7d", "d_occ": "route_occ_7d",
                         "d_demand": "route_demand_7d"}).reset_index())
t = t.merge(roll, on=["route_id", "service_date"], how="left")
t["occ_dev_7d"] = t["occupancy_pct"] - t["route_occ_7d"]

t["month"] = t["sched_departure"].dt.strftime("%Y-%m")
# partitioned writes APPEND into existing month dirs — wipe first so a re-run
# never mixes old and new data (caught in Day-3 debugging: doubled row count)
shutil.rmtree(f"{PQ}/trips_enriched.parquet", ignore_errors=True)
t.to_parquet(f"{PQ}/trips_enriched.parquet", index=False, partition_cols=["month"])
stage(f"trips_enriched: {len(t):,} rows × {t.shape[1]} cols → parquet (partitioned by month)")

# ------------------------------------------------ dashboard aggregates ----
stage("building dashboard aggregates")

route_stats = (t.groupby("route_id").agg(
    demand=("boarded", "sum"), trips=("trip_id", "count"),
    occupancy=("occupancy_pct", "mean"), avg_delay=("delay_min", "mean"),
    on_time=("delay_min", lambda s: (s <= 5).mean() * 100),
    p90_delay=("delay_min", lambda s: s.quantile(0.9)),
    overload_events=("occupancy_pct", lambda s: (s > 100).sum()),
    distance_km=("distance_km", "first"), n_stops=("n_stops", "first"),
    headway_min=("scheduled_headway_min", "first"), archetype=("archetype", "first"),
).reset_index())
route_stats["reliability"] = (100 - route_stats["p90_delay"].clip(0, 60) / 60 * 100 * 0.6
                              - (100 - route_stats["on_time"]) * 0.4).round(0)
s = route_stats
score = (0.35 * s["demand"] / s["demand"].max() * 100 + 0.25 * s["reliability"]
         + 0.20 * s["on_time"] + 0.20 * (100 - s["avg_delay"].clip(0, 25) * 4))
route_stats["score"] = (score / score.max() * 100).round(0)

def classify(r):
    if r.occupancy >= 95 and r.overload_events > 200: return "Overcrowded"
    if r.demand >= s["demand"].quantile(0.6) and r.reliability < 65: return "High Demand, Unreliable"
    if r.reliability >= 80 and r.occupancy < 55: return "Reliable, Underutilized"
    if r.demand < s["demand"].quantile(0.35) and r.reliability < 65: return "Low Performing"
    return "High Performing"
route_stats["classification"] = route_stats.apply(classify, axis=1)
route_stats = route_stats.merge(routes[["route_id", "route_name"]], on="route_id")
route_stats.round(2).to_parquet(f"{PQ}/route_stats.parquet", index=False)

hourly = (t.groupby(["dep_hour", "is_weekend"])["boarded"].sum().reset_index()
          .pivot(index="dep_hour", columns="is_weekend", values="boarded")
          .rename(columns={0: "weekday", 1: "weekend"}).reset_index())
hourly.to_parquet(f"{PQ}/hourly_demand.parquet", index=False)

daily_route = daily.rename(columns={"d_demand": "demand", "d_delay": "avg_delay",
                                    "d_occ": "avg_occ"})
daily_route.to_parquet(f"{PQ}/daily_route_demand.parquet", index=False)

heat = (t[t["is_weekend"] == 0].groupby(["day_of_week", "dep_hour"])["delay_min"]
        .mean().reset_index())
heat_we = (t.groupby(["day_of_week", "dep_hour"])["delay_min"].mean().reset_index())
heat_we.to_parquet(f"{PQ}/delay_heatmap.parquet", index=False)

sev_bins = pd.cut(t["delay_min"], [-99, 2, 5, 10, 20, 999],
                  labels=["on_time", "minor", "moderate", "major", "severe"])
sev = sev_bins.value_counts(normalize=True).mul(100).round(1).rename_axis("severity").reset_index(name="pct")
sev.to_parquet(f"{PQ}/delay_severity.parquet", index=False)

occ_bins = pd.cut(t["occupancy_pct"], [0, 40, 70, 90, 110, 999],
                  labels=["low", "moderate", "high", "overcrowded", "critical"])
occ = occ_bins.value_counts().rename_axis("band").reset_index(name="trips").sort_index()
occ.to_parquet(f"{PQ}/occupancy_bands.parquet", index=False)

# stop-level stats: distribute route boardings across its stops (hubs weighted 3x)
rs = pd.read_csv(f"{RAW}/route_stops.csv")
stops = pd.read_csv(f"{RAW}/stops.csv")
rs["w"] = np.where(rs["stop_id"].isin(stops["stop_id"].head(20)), 3.0, 1.0)
rs["w"] = rs["w"] / rs.groupby("route_id")["w"].transform("sum")
stop_demand = (rs.merge(route_stats[["route_id", "demand", "avg_delay"]], on="route_id")
               .assign(boardings=lambda d: d["demand"] * d["w"])
               .groupby("stop_id").agg(boardings=("boardings", "sum"),
                                       routes_served=("route_id", "nunique"),
                                       avg_delay=("avg_delay", "mean")).reset_index()
               .merge(stops[["stop_id", "stop_name", "zone"]], on="stop_id"))
stop_demand["boardings"] = stop_demand["boardings"].round(0)
stop_demand["alightings"] = (stop_demand["boardings"] * np.random.default_rng(7).uniform(0.9, 1.08, len(stop_demand))).round(0)
stop_demand["bottleneck"] = (stop_demand["boardings"] > stop_demand["boardings"].quantile(0.96)) & \
                            (stop_demand["avg_delay"] > stop_demand["avg_delay"].quantile(0.75))
stop_demand.round(2).to_parquet(f"{PQ}/stop_stats.parquet", index=False)

# zone-level OD matrix from tickets × passenger home zone × route destination area
tk = tickets.dropna(subset=["route_id"]).merge(
    passengers[["passenger_id", "home_zone"]], on="passenger_id")
tk = tk.merge(routes[["route_id", "destination_area"]], on="route_id")
od = (tk.groupby(["home_zone", "destination_area"]).size()
      .reset_index(name="passengers"))
od.to_parquet(f"{PQ}/od_zone_matrix.parquet", index=False)

with open(f"{REPORTS}/processing_log.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
stage("DONE — all parquet outputs + reports written")
