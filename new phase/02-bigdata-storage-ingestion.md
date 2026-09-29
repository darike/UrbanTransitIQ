# Phase 2 — Big Data Storage & Ingestion
**Maps to SRS:** Step 2 (Bigdata Storage), Step 3 (Data Ingestion), Functional Req xi-xiii, xvi-xviii
**Folders:** `hdfs_scripts/`, `spark_jobs/`, `parquet_data/`

## Goal
Store the raw dataset using proper Big Data formats/technologies and ingest it via Spark/PySpark with schema validation, partitioning, and Parquet output.

## Prerequisites
- Phase 1 complete: raw CSVs exist in `raw_data/`.
- Hadoop/HDFS running (or documented local-simulation fallback — see Phase 0 §4.2).

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 2.1 HDFS Storage
1. Create `hdfs_scripts/load_to_hdfs.sh`:
```bash
#!/bin/bash
hdfs dfs -mkdir -p /urbantransit/raw_data
hdfs dfs -put -f raw_data/*.csv /urbantransit/raw_data/
hdfs dfs -ls /urbantransit/raw_data/
```
2. Run it, take a screenshot of `hdfs dfs -ls` output → save to `screenshots/hdfs_listing.png`.

### 2.2 Explicit Schema Definition
Create `spark_jobs/schemas.py` — define an explicit `pyspark.sql.types.StructType` schema for EACH of the 12 tables (do not rely only on inferSchema in production ingestion — inferSchema is fine for exploration but the final ingestion job must use explicit schemas per SRS requirement).

### 2.3 Ingestion Job
Create `spark_jobs/01_ingest_raw_data.py`:
- Start a `SparkSession` (local mode is fine, name it `UrbanTransitIQ-Ingestion`).
- Read each CSV from HDFS path `hdfs://localhost:9000/urbantransit/raw_data/<table>.csv` (or local path fallback) using its explicit schema from `schemas.py`.
- Demonstrate BOTH explicit schema loading AND schema inference (load one table both ways and print `.printSchema()` for comparison — this satisfies "Schema Inference" + "Explicit schema definition" together).
- Validate data types post-load (e.g. assert `passenger_count` columns are IntegerType, timestamps are TimestampType) — log any mismatches.
- Repartition large tables appropriately, e.g.:
```python
tickets_df = tickets_df.repartition(8, "route_id")  # or by date for time-series tables
```
- Write each table to `parquet_data/<table>.parquet` using `.write.mode("overwrite").parquet(...)`. At minimum, `tickets` and `passenger_counts` (your largest tables) MUST be in Parquet — this is a hard SRS requirement.
- Also read back one Parquet file to prove round-trip works, print row count + schema.
- Print ingestion summary (rows read, rows written, time taken per table) — save to `reports/ingestion_log.txt`.

### 2.4 Partitioning Strategy
Document your partitioning choice in `documentation/bigdata_architecture.md`:
- Partition large fact tables (tickets, passenger_counts, delays, gps_events) by a logical column, e.g. `date` or `route_id`, and explain why (query patterns you expect: filter by route, filter by date range).

### 2.5 Big Data Architecture Diagram
Add to `documentation/bigdata_architecture.md` a text/mermaid diagram showing: Raw CSV → HDFS → Spark ingestion (schema validation) → Parquet (partitioned) → downstream Spark SQL/MLlib jobs. (This becomes your official Big Data Architecture deliverable — expand later in Phase 13.)

## Deliverables Checklist
- [ ] `hdfs_scripts/load_to_hdfs.sh` + screenshot of HDFS listing
- [ ] `spark_jobs/schemas.py` with all 12 explicit schemas
- [ ] `spark_jobs/01_ingest_raw_data.py` — runs end to end
- [ ] `parquet_data/*.parquet` for all tables (tickets & passenger_counts mandatory)
- [ ] `reports/ingestion_log.txt`
- [ ] `documentation/bigdata_architecture.md` (partitioning + diagram)
- [ ] Development log entry

## Acceptance Criteria
- `spark-submit spark_jobs/01_ingest_raw_data.py` (or `python spark_jobs/01_ingest_raw_data.py`) runs without errors on the full dataset.
- Reading a Parquet output back gives the same row count as the source CSV.
- Explicit schema vs inferred schema comparison is printed/logged somewhere reviewable.
- You can explain (out loud, to an evaluator) why you chose your partition column — this WILL be asked per the Anti-Shortcut Requirements.

Next: **03-data-quality-cleaning.md**
