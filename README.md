# UrbanTransit IQ — Big Data & Data Science Transport Intelligence

TechWiz 7 · Theme: TransitVerse Intelligence · Category: Data Science Intelligence Arena

**Live demo (frontend):** https://urbantransit-iq.vercel.app · **Technical blog:** https://urbantransit-iq.vercel.app/blog.html · **Repository:** https://github.com/darike/UrbanTransitIQ

> The Vercel deployment runs the full stack: the React dashboard plus the FastAPI backend as a
> Python serverless function at `/api/*` (entry point `api/index.py`). The app database is copied
> to `/tmp` on cold start, so accounts created on the live demo are not permanent — the four demo
> accounts always exist. Locally, run both tiers as in Quick start below.

A 2-tier web application over a real Big Data pipeline: a **2.06M-record synthetic
transport dataset** → quality analysis & cleaning → 9-table integration →
23-feature analytical layer (Parquet) → **dual ML pipelines** (delay severity,
demand forecast, crowding risk, route clustering) → **FastAPI** backend (JWT +
RBAC) → **React** dashboard SPA with a live network map.

## Quick start

```bash
# 0) Python 3.12+, Node 18+
pip install -r backend/requirements.txt
npm install

# 1) Generate the dataset (SRS scale: 2M+ tickets, 100 routes, 500 stops…)
python data_generator/generate_dataset.py

# 2) Process: quality → clean(+audit) → join → features → Parquet aggregates
python python_pipeline/process.py

# 3) Train models (3 algorithms compared, chronological split, no leakage)
python python_pipeline/train_models.py

# 4) Evidence-based recommendations + application DB (4 demo accounts)
python recommendation_engine/generate_recommendations.py
python database/seed.py

# 5) Backend (http://localhost:8000/docs = Swagger)
uvicorn backend.src.main:app --reload --port 8000

# 6) Frontend (http://localhost:5173)
npm run dev

# 7) Tests
pytest backend/tests -q
```

**Logins:** `admin/admin123` · `operator/operator123` · `analyst/analyst123` · `evaluator/evaluator123`
(JWT via the backend; the UI falls back to offline demo mode with a visible badge if the API is down.)

## Hadoop / Spark

Full PySpark jobs live in `spark_jobs/` (ingestion with explicit schemas +
partitioned Parquet, quality+cleaning, Spark SQL joins/features, MLlib training)
and `spark_sql/analytics.sql`; `hdfs_scripts/put_to_hdfs.sh` loads HDFS.
The Windows dev machine has no Java, so the identical processing runs through
`python_pipeline/process.py` — the constraint, mitigation and demo-machine
evidence plan are documented in `hdfs_scripts/README.md` and the Development Log.

## Repository map

| Path | Contents |
|---|---|
| `data_generator/` | seeded 2M+ record generator with planted data-quality defects |
| `raw_data/` → `processed_data/` → `parquet_data/` | raw → cleaned(+quarantine, audit) → analytical Parquet |
| `spark_jobs/`, `spark_sql/`, `hdfs_scripts/` | Spark/HDFS layer |
| `python_pipeline/` | executable processing engine + model training |
| `models/`, `reports/` | saved models (joblib) + metrics/quality/comparison reports |
| `recommendation_engine/` | evidence-based recommendation generator |
| `database/` | SQLAlchemy models + seed (SQLite dev, PostgreSQL-ready) |
| `backend/` | FastAPI app (auth, dashboards, entities, what-if, admin) + pytest suites |
| `src/` | React SPA (Vite, framer-motion, recharts, react-leaflet) |
| `documentation/` | development log, data dictionary, installation notes |
| `config/config.yaml` | single source for paths, thresholds, SRS minimums |

## Dashboards (SRS Steps 50-58)

Landing → Executive Command Center · Passenger Flow (OD) · Route Performance
(classification + details panel) · Delay Intelligence · Occupancy & Crowding ·
Demand Forecast · Live Network Map (satellite, live vehicles) · Spark-vs-Python
comparison · Anomalies · Data Quality · HDFS & Spark Jobs · Recommendations ·
What-If Simulator (estimates labelled) · Reports & CSV export · Power BI embed.
Shared filter bar (date range / route / direction / peak / occupancy) changes
the numbers server-side; wired pages show a **live / demo** source badge.

## Integrity (SRS §1.8)

Predictions come from this repo's own trained models — no external generative-AI
decision APIs. AI tooling used during development is declared in `AI_USAGE.md`.
Key honesty checkpoints (see Development Log): leakage removed from the delay
classifier; forecaster reworked until it beat the naive baseline; overcrowding
records are kept, never cleaned away.
