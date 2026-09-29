# Phase 10 — Spark MLlib Modelling, Independent Python Pipeline, Dual-Pipeline Comparison
**Maps to SRS:** Step 41 (Spark MLlib), Step 42 (Independent Python), Step 43 (Dual-Pipeline Comparison), Step 44 (Model Comparison Report), Competition Integrity items 8-10
**Folder:** `models/`, `python_pipeline/`

## Goal
Formally consolidate and validate that you have TWO fully independent modelling pipelines solving the same problem(s), and produce the mandatory ≥100-case comparison report.

## Prerequisites
- Phase 7 (delay models) and Phase 8 (demand/occupancy models) already produced Spark AND Python versions individually. This phase is about consolidating, re-validating independence, and formally comparing.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 10.1 Confirm Coverage
Pick AT LEAST ONE major analytical task that has genuinely independent Spark MLlib and Python implementations (recommended: **Delay Prediction**, since it's already built in Phase 7). Recommended additional coverage if time allows: Demand Prediction, Route Classification, Occupancy-Risk Prediction.

### 10.2 Spark MLlib Model Finalization
`models/spark_pipeline/train_final.py`:
- Re-confirm at least 3 algorithms evaluated (Logistic Regression, Decision Tree, Random Forest, Gradient-Boosted Trees, Linear Regression, or K-Means depending on task type).
- Save final chosen model with `model.write().save("models/spark_pipeline/delay_model_v1")`.
- Log hyperparameters, training/validation/test metrics, confusion matrix (if classification) to `reports/spark_model_report.md`.

### 10.3 Independent Python Pipeline Finalization
`python_pipeline/train_final.py`:
- Must NOT import or reuse any Spark model output as a feature or label. It must independently read the same underlying cleaned/featured data and train from scratch (Pandas/Scikit-learn/XGBoost/Statsmodels/SciPy).
- Save with `joblib.dump(model, "models/python_pipeline/delay_model_v1.pkl")`.
- Log hyperparameters, train/val/test metrics, confusion matrix/regression metrics to `reports/python_model_report.md`.

### 10.4 Dual-Pipeline Comparison
`python_pipeline/dual_pipeline_comparison.py`:
- Select a held-out set of **at least 100 unseen cases** (trips/routes not used in training either model).
- For each case, produce a row with:
  - Trip ID / Route ID
  - Actual result (ground truth)
  - Spark result
  - Python result
  - Match / Mismatch
  - Prediction probability or predicted value
  - Numerical difference
  - Consistency status
  - Explanation of disagreement (auto-generate a short rule-based note, e.g. "Spark predicted On-Time, Python predicted Minor Delay — case has unusually low historical delay history, borderline threshold")
  - Overall agreement percentage (single summary number at the bottom)
- Save as `reports/dual_pipeline_comparison.csv` AND a readable `reports/dual_pipeline_comparison_report.md` summarizing the agreement rate and discussing WHY disagreements happen (e.g. different algorithm bias, different feature scaling, different handling of missing values).

### 10.5 Model Version Tracking
Create `database/model_registry` table (or a simple `models/model_registry.json`) tracking: model_name, pipeline (spark/python), version, trained_date, metrics, file_path. Every retrain appends a new version row — never overwrite silently. (Satisfies Functional Req lxviii — Model Version Tracking.)

## Deliverables Checklist
- [ ] `models/spark_pipeline/` saved model + `reports/spark_model_report.md`
- [ ] `models/python_pipeline/` saved model + `reports/python_model_report.md`
- [ ] `reports/dual_pipeline_comparison.csv` (≥100 rows) + `.md` summary
- [ ] `models/model_registry.json` (or DB table)
- [ ] Development log entry

## Acceptance Criteria
- You can point to the exact line where Spark's prediction is generated and the exact separate line where Python's prediction is generated, and prove neither reads the other's output.
- Comparison report has ≥100 rows and a computed overall agreement %.
- You can explain, live, why any single row disagrees (this is explicitly called out as something evaluators will ask).

Next: **11-recommendation-whatif-engine.md**
