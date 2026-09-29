#!/usr/bin/env bash
# Re-run only the MLlib job (numpy added to the venv for pyspark.ml).
set -e -o pipefail
REPO=/mnt/f/urbanuinqe/urbantransit-iq
VENV=$HOME/utiq-venv
export JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which java)")")")
export SPARK_HOME=$($VENV/bin/python -c 'import pyspark, os; print(os.path.dirname(pyspark.__file__))')
export PYSPARK_PYTHON=$VENV/bin/python
export PYSPARK_DRIVER_PYTHON=$VENV/bin/python
export PYSPARK_SUBMIT_ARGS="--driver-memory 4g pyspark-shell"
$VENV/bin/pip install -q numpy
cd $REPO
LOG=$REPO/reports/spark_execution_log.txt
echo "==================== spark job 04_mllib_models.py RETRY ($(date +%T)) ====================" | tee -a $LOG
UTIQ_SAMPLE=0.3 $VENV/bin/python spark_jobs/04_mllib_models.py 2>>$LOG | tee -a $LOG
echo "SPARK-MLLIB-OK ($(date +%T))" | tee -a $LOG
