#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
export DISPLAY=:99
Xvfb :99 -screen 0 1280x800x24 > xvfb.log 2>&1 &
XVFB_PID=$!
sleep 2
npm run dev > vite-dev.log 2>&1 &
VITE_PID=$!
for i in $(seq 1 20); do curl -s http://localhost:5173/ >/dev/null && break; sleep 1; done
evenhub-simulator http://localhost:5173 > simulator.log 2>&1 &
SIM_PID=$!
sleep 10
ffmpeg -y -f x11grab -video_size 1280x800 -i :99 -frames:v 1 docs/simulator-digest-ui-2026-11-24.png > /dev/null 2>&1
sleep 1
ffmpeg -y -f x11grab -video_size 1280x800 -i :99 -frames:v 1 docs/simulator-digest-ui-2026-11-24-b.png > /dev/null 2>&1
kill $SIM_PID $VITE_PID $XVFB_PID 2>/dev/null
wait 2>/dev/null
ls -lh docs/*.png
