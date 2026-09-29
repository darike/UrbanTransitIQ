#!/usr/bin/env bash
# UrbanTransit IQ — Phase 2: load the raw dataset into HDFS.
# Run on a machine with Hadoop 3.x configured (single-node pseudo-distributed is fine).
# Usage: bash hdfs_scripts/put_to_hdfs.sh
set -euo pipefail

HDFS_BASE=/urbantransit
RAW_LOCAL=raw_data

echo "[hdfs] creating directory layout"
hdfs dfs -mkdir -p ${HDFS_BASE}/raw_data
hdfs dfs -mkdir -p ${HDFS_BASE}/processed_data
hdfs dfs -mkdir -p ${HDFS_BASE}/parquet_data
hdfs dfs -mkdir -p ${HDFS_BASE}/quarantine

echo "[hdfs] uploading raw files"
for f in tickets.csv trips.csv passenger_counts.csv routes.csv stops.csv \
         route_stops.csv vehicles.csv passengers.csv schedules.csv \
         service_calendar.csv gps_events.csv delays.json; do
  hdfs dfs -put -f ${RAW_LOCAL}/${f} ${HDFS_BASE}/raw_data/
  echo "  put ${f}"
done

echo "[hdfs] verifying"
hdfs dfs -ls -h ${HDFS_BASE}/raw_data
hdfs dfsadmin -report | head -n 20

# Screenshot this output for the submission (screenshots/hdfs_ls.png).
