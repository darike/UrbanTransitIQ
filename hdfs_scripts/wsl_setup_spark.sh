#!/usr/bin/env bash
# WSL evidence machine — PySpark setup (Java 17 already present).
set -e
python3 -m venv ~/utiq-venv
~/utiq-venv/bin/pip install -q --upgrade pip
~/utiq-venv/bin/pip install -q pyspark
~/utiq-venv/bin/python - <<'PY'
import pyspark
print("pyspark", pyspark.__version__)
PY
echo SETUP-OK
