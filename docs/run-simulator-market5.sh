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
for i in 1 2 3 4; do python3 docs/click.py 805 305; sleep 2; done
shot docs/simulator-market-btc-2026-11-24.png
for i in 1 2 3; do python3 docs/click.py 805 305; sleep 2; done
shot docs/simulator-market-hype-2026-11-24.png
pkill -f evenhub-simulator; pkill -f "vite"; pkill Xvfb; true
ls -lh docs/simulator-market-btc-2026-11-24.png docs/simulator-market-hype-2026-11-24.png
