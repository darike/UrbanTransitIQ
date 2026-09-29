# Phase 9 — Stop Performance, Reliability, Headway, Frequency, Anomalies, Segmentation
**Maps to SRS:** Steps 27-40 (Stop-Level Performance → Passenger Behavior Segmentation)
**Folder:** `spark_jobs/`, `python_pipeline/`

This phase bundles a large group of related, smaller analyses. Implement each as its own small script under `spark_jobs/analysis/` for traceability (evaluators can point at any one and ask you to explain it).

## Prerequisites
- Phases 4-8 complete (features, delay, forecasting all available).

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 9.1 Stop-Level Performance Analysis (Step 27)
`stop_performance.py` — per stop: boarding count, alighting count, passenger turnover, average delay, demand by time, trip frequency, route connectivity (# routes serving it).

### 9.2 Bottleneck Stop Detection (Step 28)
`bottleneck_stops.py` — flag stops with repeated delays, long dwell times, high boarding volumes, high passenger accumulation, frequent overcrowding. Combine into a bottleneck score.

### 9.3 Travel-Time Analysis (Step 29)
`travel_time_analysis.py` — compare scheduled vs actual vs historical average vs peak vs off-peak travel time, per route.

### 9.4 Route Reliability Analysis (Step 30)
`route_reliability.py` — % on-time trips, delay variation (std dev), missed schedules, excessively early arrivals, travel-time consistency (coefficient of variation).

### 9.5 Schedule Adherence Analysis (Step 31)
`schedule_adherence.py` — classify each trip: early arrival / on-time / late arrival / missed trip / irregular interval.

### 9.6 Headway Analysis (Step 32)
`headway_analysis.py` — time difference between consecutive vehicles on the same route (use `lag()` window function ordered by scheduled/actual time per route+direction+stop). Identify bunching (headway near 0), excessive gaps (headway >> scheduled), irregular headways (high variance).

### 9.7 Vehicle Bunching Detection (Step 33)
`bunching_detection.py` — explicit flag when 2+ vehicles on same route operate unusually close together (headway below a configurable threshold, e.g. < 3 minutes when scheduled is 15). Output flagged events list.

### 9.8 Service Frequency Analysis (Step 34)
`service_frequency.py` — compare scheduled frequency vs passenger demand vs occupancy vs peak demand vs delay. Classify each route/time-slot as: too much frequency / too little frequency / well-matched.

### 9.9 Demand-Supply Gap Analysis (Step 36)
`demand_supply_gap.py` — compare passenger demand with available capacity (vehicles × capacity × frequency). Identify excess demand, excess supply, balanced.

### 9.10 Capacity Optimization (Step 37)
`capacity_optimization.py` — identify where larger vehicles are needed, smaller vehicles suffice, additional trips required, or frequency can be reduced. Base this on the gap analysis + occupancy trends.

### 9.11 Special Event Detection (Step 38)
`special_event_detection.py` — detect unusual demand spikes (statistical outliers vs rolling baseline, e.g. z-score > 3) that should NOT redefine "normal" demand. Tag these dates/routes so Phase 6/8 models can optionally exclude or down-weight them.

### 9.12 Anomaly Detection (Step 39)
`anomaly_detection.py` — detect: sudden passenger spikes/drops, abnormal delays, unexpected route usage, excessively low passenger counts, duplicate ticketing (cross-check with Phase 3 cleaning — this is the analytical-layer version), impossible occupancy, abnormal travel time, irregular stop activity. Use a mix of statistical (z-score/IQR) and, optionally, an Isolation Forest (sklearn) for multivariate anomalies.

### 9.13 Passenger Behavior Segmentation (Step 40)
`passenger_segmentation.py` — segment passengers by travel frequency, preferred routes, time-of-day behavior, weekday/weekend split, trip distance, OD patterns. Use K-Means or rule-based segmentation into: Daily Commuters, Occasional Travellers, Peak-Hour Travellers, Weekend Travellers, Long-Distance Travellers.

## Deliverables Checklist
- [ ] All 13 scripts above, each independently runnable
- [ ] Output tables saved to `parquet_data/analytics/` with clear names
- [ ] `reports/bunching_events.md`, `reports/anomalies_detected.md`, `reports/passenger_segments.md`
- [ ] Development log entry

## Acceptance Criteria
- Headway and bunching detection thresholds are config-driven.
- Special-event flag exists and is actually referenced (not just computed and ignored) by at least one earlier phase's scoring logic — go back and wire it into Phase 6.6 case #6 if not already done.
- Anomaly detection produces a bounded, reviewable list (not thousands of false positives — tune thresholds).

Next: **10-dual-pipeline-spark-python.md**
