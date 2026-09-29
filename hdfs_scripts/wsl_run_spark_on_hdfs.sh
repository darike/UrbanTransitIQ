#!/usr/bin/env bash
# Integration evidence: Spark reading from AND writing to real HDFS
# (UTIQ_USE_HDFS=1 switches every path in spark_jobs/utiq_spark.py to hdfs://).
set -e -o pipefail
REPO=/mnt/f/urbanuinqe/urbantransit-iq
VENV=$HOME/utiq-venv
export HADOOP_HOME=$HOME/hadoop-3.4.1
export JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which java)")")")
export SPARK_HOME=$($VENV/bin/python -c 'import pyspark, os; print(os.path.dirname(pyspark.__file__))')
export PYSPARK_PYTHON=$VENV/bin/python
export PYSPARK_DRIVER_PYTHON=$VENV/bin/python
export PYSPARK_SUBMIT_ARGS="--driver-memory 4g pyspark-shell"
export PATH=$PATH:$HADOOP_HOME/bin
export UTIQ_USE_HDFS=1
cd $REPO

LOG=$REPO/reports/spark_on_hdfs_log.txt
{
  echo "=== Spark-over-HDFS integration run ($(date)) ==="
  $VENV/bin/python spark_jobs/01_ingest.py
  echo
  echo "$ hdfs dfs -ls /urbantransit/parquet_data"
  hdfs dfs -ls /urbantransit/parquet_data
  echo
  echo "$ hdfs dfs -du -h /urbantransit/parquet_data"
  hdfs dfs -du -h /urbantransit/parquet_data
  echo "SPARK-HDFS-OK"
} 2>&1 | tee $LOG
