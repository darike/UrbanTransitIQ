#!/usr/bin/env bash
# WSL evidence machine — single-node HDFS (Hadoop 3.4.1) without start-dfs.sh/ssh:
# daemons are started directly with `hdfs --daemon start`, so no passwordless-ssh
# setup is needed. Produces reports/hdfs_evidence.txt in the repo.
set -e

REPO=/mnt/f/urbanuinqe/urbantransit-iq
export HADOOP_HOME=$HOME/hadoop-3.4.1
export JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which java)")")")
export PATH=$PATH:$HADOOP_HOME/bin
echo "JAVA_HOME=$JAVA_HOME"

mkdir -p $HOME/hadoopdata/namenode $HOME/hadoopdata/datanode

cat > $HADOOP_HOME/etc/hadoop/core-site.xml <<EOF
<configuration>
  <property><name>fs.defaultFS</name><value>hdfs://localhost:9000</value></property>
</configuration>
EOF

cat > $HADOOP_HOME/etc/hadoop/hdfs-site.xml <<EOF
<configuration>
  <property><name>dfs.replication</name><value>1</value></property>
  <property><name>dfs.namenode.name.dir</name><value>file://$HOME/hadoopdata/namenode</value></property>
  <property><name>dfs.datanode.data.dir</name><value>file://$HOME/hadoopdata/datanode</value></property>
  <property><name>dfs.permissions.enabled</name><value>false</value></property>
</configuration>
EOF

echo "JAVA_HOME=$JAVA_HOME" >> $HADOOP_HOME/etc/hadoop/hadoop-env.sh

# idempotent: format only a fresh namenode dir; a refusal (already formatted /
# already running) is fine and must not abort the script
if [ ! -d "$HOME/hadoopdata/namenode/current" ]; then
  hdfs namenode -format -nonInteractive -force > /tmp/nn_format.log 2>&1 \
    && echo "namenode formatted" \
    || echo "format skipped: $(tail -n1 /tmp/nn_format.log)"
fi

hdfs --daemon start namenode || true
hdfs --daemon start datanode || true
sleep 6
jps

echo "== creating layout =="
hdfs dfs -mkdir -p /urbantransit/raw_data /urbantransit/processed_data \
                   /urbantransit/parquet_data /urbantransit/quarantine

echo "== uploading raw dataset =="
for f in routes.csv stops.csv route_stops.csv vehicles.csv passengers.csv \
         schedules.csv service_calendar.csv gps_events.csv passenger_counts.csv \
         trips.csv delays.json tickets.csv; do
  hdfs dfs -put -f $REPO/raw_data/$f /urbantransit/raw_data/ && echo "  put $f"
done

EV=$REPO/reports/hdfs_evidence.txt
{
  echo "=== UrbanTransit IQ — HDFS evidence ($(date)) ==="
  echo; echo "$ jps"; jps
  echo; echo "$ hdfs dfs -ls -h /urbantransit/raw_data"; hdfs dfs -ls -h /urbantransit/raw_data
  echo; echo "$ hdfs dfs -du -h -s /urbantransit"; hdfs dfs -du -h -s /urbantransit
  echo; echo "$ hdfs dfsadmin -report"; hdfs dfsadmin -report | head -n 30
} | tee $EV
echo HDFS-OK
