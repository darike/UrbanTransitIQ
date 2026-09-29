# AI Tool Usage Declaration — UrbanTransit IQ

Per SRS §1.8 (Competition Integrity), every AI tool used during development is
declared here. AI-generated code was reviewed, adapted to this project's own
schema/config/naming, and tested by the team before committing.

| Field | Entry 1 |
|---|---|
| **Tool name** | Claude Code (Anthropic) |
| **Purpose** | Scaffolding and drafting: dataset-generator structure, Spark job templates, pandas processing engine, model-training scripts, FastAPI routers, React dashboard components, documentation drafts |
| **Type of help** | Code generation + refactoring assistance |
| **Files/modules affected** | `data_generator/`, `python_pipeline/`, `spark_jobs/`, `backend/`, `database/`, `src/` (frontend), documentation |
| **Modifications made** | Column names, thresholds and business rules aligned to `config/config.yaml`; leakage removed from the delay classifier feature set (pre-trip features only); forecasting reworked to residual-over-baseline after the first version failed to beat the naive baseline; quality rules tuned to the planted defect classes; UI adapted to the team's design |
| **Testing performed** | `pytest backend/tests` (pipeline + API + RBAC), manual dashboard verification against Parquet aggregates, quality-report counts checked against planted defect fractions |
| **Verifying team member** | (fill in before submission) |

## Boundaries honoured

- **No generative-AI decisions:** all analytics, predictions, classifications,
  forecasts and recommendations are produced by the project's own Spark/Python
  pipelines and trained models — no external AI decision API is called at
  runtime, anywhere.
- Model results (accuracy, F1, MAE, AUC) are computed by the evaluation code in
  `python_pipeline/train_models.py` and stored in `reports/model_metrics.json`;
  none are hand-written.
- AI-generated images (dashboard concept art) were used for design reference
  only and are declared here.
