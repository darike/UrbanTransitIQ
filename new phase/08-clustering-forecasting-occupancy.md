# Phase 8 — Route Clustering, Demand Forecasting, Occupancy & Crowding-Risk Prediction
**Maps to SRS:** Step 21 (Route Clustering), Step 22-24 (Demand Forecasting + validation + evaluation), Step 25 (Occupancy Forecasting), Step 26 (Crowding Risk Prediction)
**Folder:** `route_clustering/`, `forecasting/`, `occupancy_analysis/`

## Goal
Group similar routes with unsupervised learning; forecast passenger demand and occupancy with properly time-validated models; predict crowding risk probability.

## Prerequisites
- Phase 6 (route scores) and Phase 7 (delay features) complete.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 8.1 Route Clustering
Create `route_clustering/01_route_clustering.py`. Attributes: demand, average occupancy, average delay, reliability, trip frequency, peak demand, travel time, number of stops.
- Standardize/scale features.
- Try K-Means (with elbow method to pick K), Hierarchical Clustering, and DBSCAN — compare with silhouette score, pick best, document why.
- Save cluster assignments to `parquet_data/analytics/route_clusters.parquet` and a short interpretation of each cluster ("Cluster 0 = high-frequency reliable urban routes", etc.) in `reports/route_cluster_profile.md`.

### 8.2 Passenger Demand Forecasting
Create `forecasting/02_demand_forecasting_features.py` then two pipelines:
- `forecasting/03_demand_forecast_spark.py` (Spark MLlib — e.g. regression on time-based features, or a rolling-average/ARIMA-style baseline implemented via Spark SQL window functions)
- `forecasting/04_demand_forecast_python.py` (Statsmodels ARIMA/SARIMA or Prophet-style, or sklearn/XGBoost regressor on lag features)
- Forecast at multiple granularities: route, stop, time period, day, trip — at minimum implement route-level and one more (e.g. stop-level).
- Support a configurable future horizon (e.g. `forecast_days=30` parameter).

### 8.3 Time-Aware Validation (applies to ALL forecasting here)
- Chronological split only (train on earliest N months, validate on next, test on latest) — never shuffle/random split time series.
- No feature may be computed using information from AFTER the point being predicted (e.g. a "30-day rolling average" feature for day X must only use days before X).

### 8.4 Forecast Evaluation
Create `forecasting/05_forecast_evaluation.py`:
- Compute MAE, RMSE, MAPE, and R² (where appropriate) for every forecast model.
- Build a documented simple baseline (e.g. "predict tomorrow = same weekday last week" / naive persistence) and show your model beats it. Save comparison table to `reports/forecast_evaluation.md`.

### 8.5 Occupancy Forecasting
Create `occupancy_analysis/06_occupancy_forecast.py`. Inputs: historical passenger count, trip time, route, day, service frequency, previous occupancy, peak indicator. Predict future occupancy % per route/trip.

### 8.6 Crowding Risk Prediction
Create `occupancy_analysis/07_crowding_risk.py`. Estimate probability that a trip exceeds the configured occupancy threshold (`config.yaml → critical_occupancy_pct`). This is a classification problem (binary: will-exceed vs won't) — use logistic regression / gradient boosting classifier. Flag high-risk trips (probability > 0.7, configurable) into `reports/high_risk_trips.md`.

## Deliverables Checklist
- [ ] `route_clustering/01_route_clustering.py` + cluster profile report
- [ ] Spark + Python demand forecasting pipelines
- [ ] `forecasting/05_forecast_evaluation.py` with MAE/RMSE/MAPE/R² + baseline comparison
- [ ] `occupancy_analysis/06_occupancy_forecast.py`
- [ ] `occupancy_analysis/07_crowding_risk.py` + high-risk trip list
- [ ] Development log entry

## Acceptance Criteria
- Clustering: silhouette score reported, cluster count justified (not arbitrarily chosen).
- Forecasting: chronological split is provably enforced in code (assert max(train_dates) < min(test_dates)).
- Forecast model beats the documented naive baseline on at least one metric — if it doesn't, document why and what you'd try next (this is fine to admit, hiding it is not).
- Crowding risk output includes probabilities, not just yes/no.

Next: **09-stop-reliability-headway-frequency.md**
