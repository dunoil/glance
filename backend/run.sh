#!/usr/bin/env bash
# Supervisor for the Glance backend: starts server.js and restarts it on
# failure. All state and logs live inside this project folder, never /tmp,
# so a VM restart loses nothing. See README.md for start/stop/check.
set -u
cd "$(dirname "$0")"
mkdir -p logs data
while true; do
  echo "[supervisor] $(date -Is) starting glance backend" >> logs/backend.log
  node server.js >> logs/backend.log 2>&1
  code=$?
  echo "[supervisor] $(date -Is) backend exited with code $code, restarting in 2s" >> logs/backend.log
  sleep 2
done
