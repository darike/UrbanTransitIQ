# Development Log — UrbanTransit IQ

## Day 1 — Environment + dataset (Phases 0–1)
- Repo structure created per plan (backend/, data_generator/, spark_jobs/, …).
- **Constraint found:** the Windows dev machine has no Java runtime → Hadoop/
  Spark cannot execute locally. Mitigation (per Phase 00 §4.2 note): Spark/HDFS
  scripts are written and runnable (`spark_jobs/`, `hdfs_scripts/put_to_hdfs.sh`),
  the identical processing runs through the pandas/pyarrow engine
  (`python_pipeline/process.py`), and HDFS evidence is captured on the
  Java-enabled demo machine. Details: `hdfs_scripts/README.md`.
- Dataset generated at full SRS scale (seed 20260928): 2,061,940 tickets;
  510,510 trips; 371,834 delay records; 100 routes; 500 stops; 250 vehicles;
  50,000 passengers; 363 days. Planted defects: missing/unknown route ids,
  duplicate scans (≤120 s), duplicate trips, invalid timestamps, swapped
  departure/arrival, negative counts, unknown vehicles, and *kept* capacity
  violations (real overcrowding). Chronically-late vehicle V118 planted.

## Day 2 — Quality, cleaning, integration, features (Phases 3–4)
- 8 quality checks (Q1–Q8) detected every planted defect class:
  4,086 / 8,187 / 510 / 608 / 512 / 201 / 102 found; 81,145 capacity
  violations detected and **kept** (they are the core signal, rule R7).
- Cleaning rules R1–R7 applied with a full audit trail
  (`processed_data/cleaning_audit.parquet`) + quarantine folder.
- 9-table integration + 23-feature table → `parquet_data/trips_enriched.parquet`
  (504,238 rows, partitioned by month). Rolling 7-day route context computed
  from *previous-day* aggregates only (leak-safe).

## Day 3 — Models (Phases 8, 10)
- **Model failure #1 (fixed):** first delay classifier hit 99.9% accuracy —
  a leakage red flag. `schedule_deviation_min` and `occupancy_pct` are measured
  during/after the trip and encode the label. Feature set reduced to pre-trip
  features only; realistic accuracy re-measured and reported honestly.
- **Model failure #2 (fixed):** first demand forecaster *lost* to the naive
  weekly baseline (−16% MAE). Reworked to residual-over-lag7 modelling with
  holiday/event/trend features — final model beats the baseline (see
  `reports/model_metrics.json`).
- Three algorithms compared for delay severity (RandomForest / XGBoost /
  LogisticRegression), chronological 70/15/15 split.
- Dual-pipeline comparison generated on the 120 newest unseen cases
  (`reports/dual_pipeline_comparison.json`). The Spark-native MLlib variant
  (`spark_jobs/04_mllib_models.py`) reproduces pipeline A on the demo machine.
- Crowding-risk model (pre-trip features): AUC in `model_metrics.json`.
- K-Means route clustering: k selected by silhouette scan (3–6).

## Day 4 — Database + backend (Phases 12–13)
- SQLite (SQLAlchemy) app DB: users (bcrypt), audit_log, model_registry,
  recommendation_state, saved_reports; 4 demo accounts seeded.
- FastAPI backend: JWT auth, server-side RBAC (403 on direct API calls, not
  just hidden buttons), dashboard endpoints over Parquet with shared filters,
  what-if simulator (outputs labelled estimates), recommendations with
  evidence, admin endpoints (quality report, pipeline log, registry, audit).
- Global exception handler → `reports/app_errors.log`.

## Day 5 — Spark + HDFS execution on WSL (evidence run)
- WSL2 Ubuntu on the same laptop (Java 17, Python 3.14, PySpark 4.2.0,
  Hadoop 3.4.1) used as the Spark/HDFS evidence machine — resolves the Day-1
  no-Java constraint on the Windows side.
- **Real single-node HDFS**: namenode+datanode via `hdfs --daemon start` (no
  ssh needed), 344.6 MB raw dataset uploaded to `/urbantransit/raw_data`,
  `dfsadmin -report` shows 1 live datanode → `reports/hdfs_evidence.txt`.
- **Spark jobs executed for real** (`reports/spark_execution_log.txt`):
  01 ingest (2,061,787 tickets, explicit schemas, partitioned Parquet, 139s);
  02 quality+clean (Q1–Q8 counts **match the pandas engine exactly** —
  cross-validation of both implementations); 03 joins+features (504,206 rows).
- **MLlib** (30% evidence sample, `UTIQ_SAMPLE=0.3`): first run scored 98.5% —
  the same leakage as Day 3 (job still used occupancy/deviation features);
  fixed to pre-trip features → **RandomForest test accuracy 86.1% / F1 0.861**,
  vs GBT-OvR 85.6% and LR 76.2% — consistent with the Python pipeline (86.7%).
- **Spark-over-HDFS integration** (`reports/spark_on_hdfs_log.txt`):
  `UTIQ_USE_HDFS=1` runs the ingest job reading `hdfs://localhost:9000` and
  writing Parquet back into HDFS (`/urbantransit/parquet_data`, 57.6 MB).
  Fix recorded: pip-PySpark has no core-site.xml, so the namenode host must be
  explicit in the URI (`utiq_spark.py`).
- Runner scripts for reproduction: `hdfs_scripts/wsl_setup_spark.sh`,
  `wsl_setup_hdfs.sh`, `wsl_run_spark_jobs.sh`, `wsl_run_mllib.sh`,
  `wsl_run_spark_on_hdfs.sh`.

## Day 5 — Frontend wiring + tests (Phases 13–14)
- React SPA calls the API with graceful demo-data fallback and a visible
  live/demo source badge on wired pages.
- `pytest backend/tests`: dataset minimums, defect detection, kept-overcrowding
  rule, no duplicate trips post-clean, classification coverage,
  forecast-beats-baseline, 120-case comparison, auth/RBAC/filter tests.
