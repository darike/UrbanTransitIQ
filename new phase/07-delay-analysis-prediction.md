# Phase 7 — Delay Analysis, Pattern Detection, Prediction & Severity
**Maps to SRS:** Step 17 (Delay Analysis), Step 18 (Delay Pattern Detection), Step 19 (Delay Prediction), Step 20 (Delay Severity Classification)
**Folder:** `delay_analysis/`

## Goal
Fully characterize delay behavior, detect recurring patterns, build a delay-risk prediction model (≥3 algorithms evaluated), and classify delay severity with configurable thresholds.

## Prerequisites
- Phase 6 complete (route scores available, useful as a predictive feature).

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 7.1 Delay Analysis (descriptive)
Create `delay_analysis/01_delay_analysis.py` — aggregate delay minutes by: route, trip, stop, vehicle, time-of-day, day, direction, distance travelled. Save summary tables to `processed_data/analytics/delay_summary_*.parquet`.

### 7.2 Delay Pattern Detection
Create `delay_analysis/02_pattern_detection.py` to identify:
- Morning congestion delays / evening congestion delays (time-bucketed delay averages)
- Delay accumulation across stops (does delay grow stop-by-stop along a trip? compute cumulative delay by stop_sequence)
- Specific stop bottlenecks (stops with abnormally high average delay contribution)
- Vehicles consistently delayed (vehicle-level delay averages vs fleet average, flag outliers)
- Routes delayed on particular days (route × day_of_week delay heatmap data)

### 7.3 Delay Prediction Model
Create `delay_analysis/03_delay_prediction_features.py` — build the feature set: route, time of day, day of week, historical delay (lag features), passenger load, number of stops, travel distance, historical travel time, peak-period flag, vehicle.

Then, per the dual-pipeline requirement, build TWO independent implementations:
- `delay_analysis/04_delay_prediction_spark.py` — Spark MLlib, evaluate at least 3 algorithms (e.g. Linear Regression / Gradient-Boosted Trees / Random Forest Regressor if predicting minutes, or Logistic Regression / Decision Tree / Random Forest if predicting a delay-class).
- `delay_analysis/05_delay_prediction_python.py` — independent Python pipeline (Scikit-learn/XGBoost/Statsmodels), same features, but implemented separately (do not just call the Spark model — reimplement in sklearn/xgboost).

Use chronological train/test split (e.g. train on months 1-10, test on months 11-12) — NEVER random split for time-based delay prediction, to avoid future-data leakage.

Save both models to `models/delay_spark/` and `models/delay_python/`, with metrics (MAE/RMSE or Accuracy/F1 depending on regression vs classification framing) saved to `reports/delay_model_metrics.md`.

### 7.4 Delay Severity Classification
Create `delay_analysis/06_delay_severity.py`. Classify predicted AND historical delays into:
- On Time
- Minor Delay
- Moderate Delay
- Major Delay
- Severe Delay

Thresholds must be pulled from `config/config.yaml` (already has `delay_minor_min`, `delay_moderate_min`, etc.) — NOT hardcoded in the function, so evaluators can do a "surprise modification: change delay thresholds" and you just edit the YAML.

## Deliverables Checklist
- [ ] `delay_analysis/01_delay_analysis.py` through `06_delay_severity.py`
- [ ] Spark delay model + Python delay model, both saved with metrics
- [ ] `reports/delay_model_metrics.md` (≥3 algorithms compared per pipeline)
- [ ] Delay severity thresholds fully config-driven
- [ ] Development log entry

## Acceptance Criteria
- You can change `delay_minor_min` in `config.yaml` and see severity classification output change without touching code.
- Both Spark and Python delay models exist independently, trained on the same chronological split, with separate saved artifacts.
- At least 3 algorithms were evaluated in EACH pipeline (6 total), with metrics logged for all, not just the winner.

Next: **08-clustering-forecasting-occupancy.md**
