#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
export DISPLAY=:99
mkdir -p docs/video
Xvfb :99 -screen 0 1280x800x24 > xvfb.log 2>&1 &
sleep 2
npm run dev > vite-dev.log 2>&1 &
for i in $(seq 1 20); do curl -s http://localhost:5173/ >/dev/null && break; sleep 1; done
evenhub-simulator http://localhost:5173 > simulator.log 2>&1 &
sleep 9
ffmpeg -y -f x11grab -video_size 1280x800 -framerate 15 -i :99 -codec:v libx264 -pix_fmt yuv420p -preset veryfast docs/video/glance-demo-draft-2026-11-24.mp4 > docs/video/ffmpeg.log 2>&1 &
FFPID=$!
sleep 4
python3 docs/click.py 872 305; sleep 5
python3 docs/click.py 872 305; sleep 5
python3 docs/click.py 872 305; sleep 5
for i in 1 2 3; do python3 docs/click.py 805 305; sleep 3; done
sleep 3
kill -INT $FFPID 2>/dev/null; sleep 2
pkill -f evenhub-simulator; pkill -f "vite"; pkill Xvfb; true
ls -lh docs/video/
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 docs/video/glance-demo-draft-2026-11-24.mp4 2>&1 || ffmpeg -i docs/video/glance-demo-draft-2026-11-24.mp4 2>&1 | head -5
