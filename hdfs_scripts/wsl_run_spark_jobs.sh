#!/usr/bin/env bash
# WSL evidence machine — run the four Spark jobs end-to-end (local[*], Java 17).
# Logs land in reports/spark_execution_log.txt inside the repo.
set -e -o pipefail
REPO=/mnt/f/urbanuinqe/urbantransit-iq
VENV=$HOME/utiq-venv
export JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which java)")")")
export SPARK_HOME=$($VENV/bin/python -c 'import pyspark, os; print(os.path.dirname(pyspark.__file__))')
export PYSPARK_PYTHON=$VENV/bin/python
export PYSPARK_DRIVER_PYTHON=$VENV/bin/python
export PYSPARK_SUBMIT_ARGS="--driver-memory 4g pyspark-shell"
cd $REPO

LOG=$REPO/reports/spark_execution_log.txt
: > $LOG
run() {
  echo "==================== spark job $1 ($(date +%T)) ====================" | tee -a $LOG
  $VENV/bin/python spark_jobs/$1 2>>$LOG | tee -a $LOG
}

run 01_ingest.py
run 02_quality_and_clean.py
run 03_join_features.py
UTIQ_SAMPLE=0.3 run 04_mllib_models.py

echo "SPARK-JOBS-OK ($(date +%T))" | tee -a $LOG
