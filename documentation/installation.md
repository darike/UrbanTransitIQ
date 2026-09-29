# Installation & Execution — UrbanTransit IQ

## Supported OS
Windows 10/11, Linux (Ubuntu 20.04+), macOS. The Python pipeline + backend +
frontend run everywhere; Hadoop/Spark execution needs Java (Linux/WSL recommended).

## 1. Core tools
- **Python 3.12+** → `pip install -r backend/requirements.txt`
- **Node 18+** → `npm install`
- **Java 11 (for Spark/HDFS only)** → `sudo apt install openjdk-11-jdk`

## 2. Hadoop 3.3.6 + HDFS (Spark evidence machine)
```bash
wget https://downloads.apache.org/hadoop/common/hadoop-3.3.6/hadoop-3.3.6.tar.gz
tar -xzf hadoop-3.3.6.tar.gz && sudo mv hadoop-3.3.6 /usr/local/hadoop
export HADOOP_HOME=/usr/local/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
# configure core-site.xml + hdfs-site.xml for single-node pseudo-distributed
hdfs namenode -format && start-dfs.sh
bash hdfs_scripts/put_to_hdfs.sh          # uploads raw_data/ to /urbantransit
```

## 3. PySpark
`pip install pyspark==3.5.1` then, with `UTIQ_USE_HDFS=1` for HDFS paths:
```bash
spark-submit spark_jobs/01_ingest.py
spark-submit spark_jobs/02_quality_and_clean.py
spark-submit spark_jobs/03_join_features.py
spark-submit spark_jobs/04_mllib_models.py
```
> No Java on the dev machine? The identical pipeline runs via
> `python python_pipeline/process.py` — see `hdfs_scripts/README.md`.

## 4. End-to-end execution order
```bash
python data_generator/generate_dataset.py        # 1. dataset (≈35s, ~500 MB)
python python_pipeline/process.py                # 2. quality→clean→features (≈40s)
python python_pipeline/train_models.py           # 3. models (≈4-5 min)
python recommendation_engine/generate_recommendations.py
python database/seed.py                          # 4. app DB + demo accounts
uvicorn backend.src.main:app --port 8000         # 5. API  → /docs
npm run dev                                      # 6. UI   → :5173
pytest backend/tests -q                          # 7. tests
```

## Troubleshooting
- **`ModuleNotFoundError: backend`** — run uvicorn/pytest from the repo root.
- **Port 8000/5173 busy** — `--port 8001` / `npm run dev -- --port 5174`.
- **Frontend shows "demo data" badge** — backend not running or blocked; the UI
  intentionally degrades instead of crashing.
- **`JAVA_HOME not set` on spark-submit** — install JDK 11 and export JAVA_HOME.
- **Memory during generation** — tickets are written in 60 chunks; if a very
  low-RAM machine struggles, use `--scale 0.5` (still >1M records) and note it.
