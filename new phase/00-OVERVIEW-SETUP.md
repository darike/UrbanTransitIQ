# UrbanTransit IQ — Master Plan & Environment Setup
**Project:** UrbanTransit IQ (TechWiz 7 — Aptech, Theme: TransitVerse Intelligence)
**Purpose of this file:** Master index for all phases + one-time environment/repo setup. Read this FIRST, then execute phase files in order (01 → 14).

---

## 1. How to use these files with Codex
- Give Codex ONE phase file at a time as context, in order.
- After each phase, tell Codex: "Phase X complete — commit to GitHub with message `Phase X: <name>`."
- Do NOT skip phases — later phases depend on folder structure and outputs from earlier ones.
- Every phase file has: Goal → Prerequisites → Exact Steps → Files/Folders to create → Commands → Deliverables Checklist → Acceptance Criteria. Codex must satisfy the Acceptance Criteria before moving on.
- Competition rule reminder: meaningful GitHub commits are required across ALL 5 competition days, and every team member must contribute (code/analytics/docs/testing/modelling). Commit after every phase, not just at the end.

## 2. Full Phase List
| # | File | Covers |
|---|------|--------|
| 0 | 00-OVERVIEW-SETUP.md | Repo + environment setup (this file) |
| 1 | 01-dataset-generation.md | Synthetic transport dataset (Step 1) |
| 2 | 02-bigdata-storage-ingestion.md | HDFS/Parquet storage + Spark ingestion (Step 2–3) |
| 3 | 03-data-quality-cleaning.md | Data Quality Report + Cleaning (Step 4–5) |
| 4 | 04-integration-feature-engineering.md | Joins + Feature Engineering (Step 6–7) |
| 5 | 05-eda-passenger-flow-od.md | EDA, Passenger Flow, OD Matrix, Peak Periods (Step 8–11) |
| 6 | 06-overcrowding-route-performance.md | Overcrowding, Underutilization, Route Scoring/Classification, Tricky Cases (Step 12–16) |
| 7 | 07-delay-analysis-prediction.md | Delay analysis, pattern detection, prediction, severity (Step 17–20) |
| 8 | 08-clustering-forecasting-occupancy.md | Route clustering, demand forecasting, occupancy/crowding risk (Step 21–26) |
| 9 | 09-stop-reliability-headway-frequency.md | Stop performance, bottlenecks, travel-time, reliability, headway, bunching, frequency, capacity, special events, anomalies, segmentation (Step 27–40) |
| 10 | 10-dual-pipeline-spark-python.md | Spark MLlib pipeline + independent Python pipeline + comparison (Step 41–44) |
| 11 | 11-recommendation-whatif-engine.md | Recommendation engine, evidence, priority, what-if, scenario impact (Step 45–49) |
| 12 | 12-database-setup.md | **PostgreSQL database**: users/auth, audit log, model registry, recommendations, saved reports |
| 13 | 13-webapp-dashboards.md | Web app (React + FastAPI), all 6 dashboards, route map, search/filter (Step 50–58) |
| 14 | 14-reports-testing-export.md | Reports/export, full test suite, Data Dictionary, diagrams |
| 15 | 15-deployment-docs-submission.md | Deployment, README/AI_USAGE, blog, video, final checklist |

## 3. Tech Stack (final decisions — lock these in before coding)
- **Frontend:** **React** (with Bootstrap or Tailwind for styling) — separate SPA, calls the backend via REST API
- **Backend:** **FastAPI** (preferred — async, auto-generated OpenAPI docs, easy to test with pytest) as the single backend serving REST endpoints to React. **Flask** is an acceptable substitute per SRS if the team is more comfortable with it — pick ONE and stay consistent across all phases; these instructions assume FastAPI.
- **Big Data:** Apache Hadoop (HDFS), Apache Spark + PySpark, Spark SQL, Spark MLlib
- **Storage formats:** CSV (raw), Parquet (processed — mandatory for at least one large dataset), JSON (configs/metadata)
- **Database:** PostgreSQL (metadata, model results, audit trail, recommendations) — SQLite acceptable for local/dev fallback
- **Data Science:** Pandas, NumPy, Scikit-learn, XGBoost, Statsmodels, SciPy
- **Visualization:** Plotly.js / Recharts / Chart.js in React (dashboards), Leaflet (React) for route map
- **Auth:** JWT-based (FastAPI issues token, React stores it and attaches to API calls)
- **Testing:** pytest (backend), Jest/React Testing Library (frontend, optional but recommended)
- **Version Control:** Git + GitHub (public repo, monorepo with `backend/` and `frontend/` folders)
- **Deployment:** Backend → Render/Railway; Frontend → Vercel/Netlify (or same host serving built React static files via FastAPI's `StaticFiles`)

## 4. One-Time Environment Setup (do this once, Day 1 morning)

### 4.1 Install core tools
```bash
# Java (required for Hadoop/Spark)
sudo apt update && sudo apt install -y openjdk-11-jdk
java -version

# Python 3.10+
python3 --version
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Core Python (backend) packages
pip install pyspark pandas numpy scikit-learn xgboost statsmodels scipy \
    plotly folium fastapi "uvicorn[standard]" sqlalchemy alembic psycopg2-binary \
    pytest pyarrow faker python-dotenv python-jose[cryptography] passlib[bcrypt] \
    python-multipart reportlab

# Node.js + React (frontend) — install Node 18+ first, then:
npx create-react-app frontend
cd frontend
npm install axios react-router-dom bootstrap recharts leaflet react-leaflet
cd ..
```

### 4.2 Install Hadoop (local single-node, for HDFS demonstration)
```bash
wget https://downloads.apache.org/hadoop/common/hadoop-3.3.6/hadoop-3.3.6.tar.gz
tar -xzf hadoop-3.3.6.tar.gz
sudo mv hadoop-3.3.6 /usr/local/hadoop
# Set env vars in ~/.bashrc:
export HADOOP_HOME=/usr/local/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
# Configure core-site.xml, hdfs-site.xml (single-node pseudo-distributed mode)
hdfs namenode -format
start-dfs.sh
hdfs dfs -mkdir -p /urbantransit/raw_data
hdfs dfs -mkdir -p /urbantransit/processed_data
```
> If full HDFS setup is too heavy for the competition machine, document this constraint and use `pyspark`'s local filesystem mode with a folder that MIMICS HDFS structure (e.g. `hdfs_scripts/local_hdfs_sim/`) — but you MUST still show real `hdfs dfs` commands working at least once, screenshot it, and explain the limitation in the Development Log. Do not silently skip this — evaluators check for it.

### 4.3 Repo skeleton (create this exact structure now)
```bash
mkdir -p urbantransit-iq/{backend/src,backend/tests,data_generator,raw_data,processed_data,parquet_data,hdfs_scripts,spark_jobs,spark_sql,python_pipeline,notebooks,models,forecasting,route_clustering,delay_analysis,occupancy_analysis,recommendation_engine,database,sample_data,documentation,screenshots,reports,config}
cd urbantransit-iq
git init
touch README.md AI_USAGE.md LICENSE backend/requirements.txt
npx create-react-app frontend    # creates the frontend/ folder with its own package.json
git add . && git commit -m "Day 1: Initial repo structure (backend + frontend)"
git remote add origin <your-github-repo-url>
git push -u origin main
```
> Note: since frontend is now a separate React app, `templates/` and `static/` (server-rendered HTML) are no longer needed — React's `frontend/src/` and `frontend/public/` replace them. `src/` from the original SRS folder list becomes `backend/src/` here (FastAPI app code). `tests/` becomes `backend/tests/`.

### 4.4 backend/requirements.txt (paste this now)
```
pyspark==3.5.1
pandas
numpy
scikit-learn
xgboost
statsmodels
scipy
plotly
folium
fastapi
uvicorn[standard]
sqlalchemy
alembic
psycopg2-binary
pytest
httpx
pyarrow
faker
python-dotenv
python-jose[cryptography]
passlib[bcrypt]
python-multipart
reportlab
```

### 4.4b frontend/package.json — key dependencies (added via `npm install`, see 4.1)
```
axios          -> calling the FastAPI backend
react-router-dom -> page navigation (dashboards, login, reports, etc.)
bootstrap      -> styling
recharts       -> charts for dashboards
leaflet + react-leaflet -> route map visualization
```

### 4.5 config/config.yaml (create now — every phase will reference this)
```yaml
paths:
  raw_data: "raw_data/"
  processed_data: "processed_data/"
  parquet_data: "parquet_data/"
  models: "models/"
  reports: "reports/"
thresholds:
  overcrowding_occupancy_pct: 100
  critical_occupancy_pct: 120
  delay_minor_min: 5
  delay_moderate_min: 15
  delay_major_min: 30
  delay_severe_min: 60
dataset_minimums:
  ticketing_records: 2000000
  trip_level_records: 500000
  routes: 100
  stops: 500
  vehicles: 250
  passengers: 50000
  months_history: 12
  delay_records: 250000
```

## 5. 5-Day Competition Timeline (suggested mapping — adjust to your team size)
- **Day 1:** Setup (this file) + Phase 1 (dataset) + Phase 2 (storage/ingestion) — commit each.
- **Day 2:** Phase 3 (quality/cleaning) + Phase 4 (integration/features) + Phase 5 (EDA/flow/OD).
- **Day 3:** Phase 6 (overcrowding/route scoring) + Phase 7 (delay) + Phase 8 (clustering/forecast/occupancy).
- **Day 4:** Phase 9 (stop/reliability/headway) + Phase 10 (dual pipeline) + Phase 11 (recommendations/what-if) + Phase 12 (database setup).
- **Day 5:** Phase 13 (web app/dashboards) + Phase 14 (testing/reports) + Phase 15 (deploy/docs/submit).

## 6. Non-Negotiable Rules (apply to every phase)
1. Every predictive step needs the Spark version AND the independent Python version — never reuse Spark's output as Python's prediction.
2. Time-based models: always split train/test chronologically (no future data leaking into training).
3. Every recommendation the app shows must display its supporting evidence numbers (not just "increase frequency").
4. Log every AI tool usage in `AI_USAGE.md` as you go — don't do it retroactively on Day 5.
5. Keep a `documentation/development_log.md` and add an entry after every phase (what was done, issues, fixes, performance notes).
6. **Originality (0% plagiarism target):** every phase file below has its own "Originality Requirement" section — Codex-generated code must always be adapted to this project's own schema/config/naming before committing, never left as generic copied-looking boilerplate. This keeps plagiarism-similarity checks clean while still honestly declaring AI use in `AI_USAGE.md` (declaring AI use is required by the SRS and is not plagiarism — undeclared copying from another source is).

Proceed to **01-dataset-generation.md** next.
