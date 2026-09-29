# Phase 5 — EDA, Passenger Flow, Origin-Destination, Peak Periods
**Maps to SRS:** Step 8 (EDA), Step 9 (Passenger Flow), Step 10 (OD Matrix), Step 11 (Peak Travel Period Analysis)
**Folder:** `notebooks/`, `spark_sql/`, output → `processed_data/analytics/`

## Goal
Turn the feature table into concrete, queryable insights: top/bottom performers, passenger movement patterns, an OD matrix, and demand-driven (not fixed-slot) peak periods.

## Prerequisites
- Phase 4 complete: `parquet_data/features/trip_features.parquet` available.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 5.1 Exploratory Data Analysis
Create `notebooks/05_eda.ipynb` (or `.py` script) computing and saving as tables/CSVs in `processed_data/analytics/`:
- Highest-demand routes (top 10 by total passengers)
- Lowest-demand routes (bottom 10)
- Busiest stops / least-used stops (by boarding+alighting)
- Most delayed routes / most punctual routes
- Peak hours, peak days (by total passenger volume, computed not assumed)
- Passenger-flow trend over time (monthly/weekly line chart data)
- High-occupancy trips vs underutilized trips (lists)
- Route-wise travel-time variation (std dev of travel time per route)
- Stop-level boarding/alighting pattern tables

### 5.2 Passenger Flow Analysis
Create `spark_jobs/05_passenger_flow.py`:
- Determine origin stop and destination stop per passenger trip-leg (use ticket + passenger_counts sequencing, or GPS-inferred boarding/alighting stop order — document your method).
- Boarding patterns, alighting patterns per stop/time
- Route demand and direction-wise demand
- Stop-to-stop flows
- High-volume origin-destination pairs (top 20)

### 5.3 Origin-Destination Matrix
Create `spark_jobs/06_od_matrix.py`:
- Build OD matrix: columns = origin_stop, destination_stop, passenger_count, time_period, route, day_type
- Write to `parquet_data/analytics/od_matrix.parquet`
- Expose it filterable by route, period, stop, service type — this will be consumed directly by the Passenger Flow Dashboard in Phase 12, so make the output already filter-friendly (proper categorical columns, no free text).

### 5.4 Peak Travel Period Analysis
Create `spark_jobs/07_peak_periods.py`. IMPORTANT: peaks must be computed from actual demand curves, not hardcoded time slots (e.g. don't just declare "8-9am is peak" — bucket passenger volume by hour and statistically identify the top-demand windows per route/stop/day-type). Compute:
- Morning peak, evening peak (data-derived, not fixed)
- Midday demand
- Weekend demand
- Holiday demand (use service_calendar holiday_flag)
- Route-specific peaks
- Stop-specific peaks

## Deliverables Checklist
- [ ] `notebooks/05_eda.ipynb` with all EDA outputs saved
- [ ] `spark_jobs/05_passenger_flow.py`
- [ ] `spark_jobs/06_od_matrix.py` → `od_matrix.parquet`
- [ ] `spark_jobs/07_peak_periods.py`
- [ ] `documentation/passenger_flow_methodology.md` explaining origin/destination inference method
- [ ] Development log entry

## Acceptance Criteria
- Peak periods differ across at least a few routes (proving they are demand-derived per route, not one global fixed answer).
- OD matrix can be filtered by at least route + day_type + time_period without additional joins (pre-aggregated correctly).
- Every "top/bottom" list in EDA is reproducible by re-running the notebook/script.

Next: **06-overcrowding-route-performance.md**
