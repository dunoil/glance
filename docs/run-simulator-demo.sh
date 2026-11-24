#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
export DISPLAY=:99
Xvfb :99 -screen 0 1280x800x24 > xvfb.log 2>&1 &
sleep 2
npm run dev > vite-dev.log 2>&1 &
for i in $(seq 1 20); do curl -s http://localhost:5173/ >/dev/null && break; sleep 1; done
evenhub-simulator http://localhost:5173 > simulator.log 2>&1 &
sleep 10
shot() { ffmpeg -y -f x11grab -video_size 1280x800 -i :99 -frames:v 1 "$1" > /dev/null 2>&1; }
shot docs/simulator-digest-ui-2026-11-24.png
python3 docs/click.py 872 305; sleep 3
shot docs/simulator-message-card-2026-11-24.png
python3 docs/click.py 872 305; sleep 4
shot docs/simulator-draft-card-2026-11-24.png
python3 docs/click.py 872 305; sleep 4
shot docs/simulator-sent-card-2026-11-24.png
pkill -f evenhub-simulator; pkill -f "vite"; pkill Xvfb; true
ls -lh docs/*.png
