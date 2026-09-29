# Phase 4 — Data Integration & Feature Engineering
**Maps to SRS:** Step 6 (Data Integration), Step 7 (Feature Engineering), Functional Req xix
**Folder:** `spark_sql/`, `spark_jobs/`

## Goal
Join all cleaned tables into analysis-ready datasets using Spark SQL/PySpark, then derive every analytical feature the SRS lists.

## Prerequisites
- Phase 3 complete: clean Parquet tables in `processed_data/clean/`.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 4.1 Required Joins (implement each as a named Spark SQL view or DataFrame join)
Create `spark_sql/joins.sql` (or `.py` using `spark.sql(...)`) implementing:
1. Tickets ⋈ Passengers
2. Tickets ⋈ Trips
3. Trips ⋈ Routes
4. Trips ⋈ Vehicles
5. Trips ⋈ Schedules
6. Routes ⋈ Route_Stops
7. Route_Stops ⋈ Stops
8. Trips ⋈ Delay Records
9. Trips ⋈ Passenger_Counts
10. Stops ⋈ Location info (already in stops.csv — join through to derive stop-to-stop distances if needed)

Build one master denormalized table: `trip_master` (trip_id, route_id, vehicle_id, stop_id, scheduled/actual times, passenger counts, delay, occupancy, capacity) — this becomes the backbone for almost every later phase.

### 4.2 Feature Engineering
Create `spark_jobs/04_feature_engineering.py`. Compute and add as columns (grouped logically):

**Passenger/occupancy features:**
- Passenger count per trip, per route, per stop
- Boarding count, alighting count
- Vehicle occupancy % = (current onboard / vehicle capacity) × 100
- Route load factor (avg occupancy across trips on the route)
- Capacity utilization

**Time features:**
- Travel time (actual_end - actual_start)
- Waiting time (scheduled vs actual departure gap)
- Delay duration (actual - scheduled, in minutes)
- Peak-hour indicator (boolean, based on config-defined peak windows)
- Day-of-week indicator
- Weekend indicator
- Headway (time gap between consecutive vehicles on same route/stop — window function with `lag()`)

**Reliability/performance features:**
- Route utilization
- Stop utilization
- Route reliability (% on-time trips)
- Trip punctuality
- Delay frequency (per route/vehicle)
- Schedule deviation (scheduled vs actual, signed)

**Demand features:**
- Passenger-flow direction
- Passenger demand growth (week-over-week or month-over-month % change per route)
- Historical demand average (rolling average, e.g. trailing 7/30 days)

Use PySpark window functions (`Window.partitionBy(...).orderBy(...)`) for rolling/lag-based features — this is a good thing to explicitly show since evaluators may ask you to explain a Spark transformation.

### 4.3 Output
Write the fully-featured table to `parquet_data/features/trip_features.parquet`, partitioned by month or route_id.

## Deliverables Checklist
- [ ] `spark_sql/joins.sql` (or equivalent .py) with all 10 joins
- [ ] `spark_jobs/04_feature_engineering.py` computing all listed features
- [ ] `parquet_data/features/trip_features.parquet`
- [ ] `documentation/feature_dictionary.md` — every feature name, formula/logic, source columns
- [ ] Development log entry

## Acceptance Criteria
- The `trip_master` / `trip_features` table has zero unresolved nulls in join keys (every join is validated, no accidental row explosion from bad join conditions — sanity-check row counts before/after each join).
- Every feature in the SRS list (Step 7) exists as a column with a clear name.
- You can explain any single feature's Spark SQL/transformation logic on demand (Anti-Shortcut requirement).

Next: **05-eda-passenger-flow-od.md**
