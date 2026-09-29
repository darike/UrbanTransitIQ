# HDFS layer — layout, scripts and the local-machine constraint

## Target layout (matches `config/config.yaml → hdfs`)

```
/urbantransit
├── raw_data/          # as-generated CSV/JSON, immutable
├── processed_data/    # cleaned outputs + quarantine/
├── parquet_data/      # partitioned analytical Parquet
└── quarantine/        # rejected records kept with rule IDs
```

- `put_to_hdfs.sh` — creates the layout and uploads all 12 raw files (`hdfs dfs -put`).
- Spark jobs read via `hdfs://` URIs when `UTIQ_USE_HDFS=1` is set, and fall back to
  the identical local layout under `hdfs_scripts/local_hdfs_sim/` otherwise
  (same folder names, so paths differ only in scheme).

## Execution status — DONE on WSL2 Ubuntu (same laptop)

Windows itself has no Java, so the Spark/HDFS layer runs in **WSL2 Ubuntu**
(Java 17 · PySpark 4.2.0 · Hadoop 3.4.1). Everything below has actually been
executed; the captured evidence lives in `reports/`:

| Evidence file | What it proves |
|---|---|
| `reports/hdfs_evidence.txt` | live namenode+datanode, 344.6 MB raw dataset in `/urbantransit/raw_data`, `dfsadmin -report` |
| `reports/spark_execution_log.txt` | jobs 01–04 executed: 2.06M-ticket ingest with explicit schemas, quality counts (match the pandas engine), 504k-row feature build, MLlib comparison (RF 86.1% test acc.) |
| `reports/spark_on_hdfs_log.txt` | Spark reading `hdfs://localhost:9000` and writing partitioned Parquet back into HDFS |

Reproduce on any WSL/Linux box (in order):

```bash
bash hdfs_scripts/wsl_setup_spark.sh      # venv + PySpark
bash hdfs_scripts/wsl_setup_hdfs.sh       # Hadoop config + daemons + upload (needs ~/hadoop-3.4.1)
bash hdfs_scripts/wsl_run_spark_jobs.sh   # jobs 01→04 on local FS
bash hdfs_scripts/wsl_run_spark_on_hdfs.sh# ingest via hdfs:// end-to-end
```

Note: the day-to-day pipeline on the Windows side still runs through the
equivalent pandas/pyarrow engine (`python_pipeline/process.py`); the Spark run
above cross-validates it — the Q1–Q8 quality counts agree exactly.
