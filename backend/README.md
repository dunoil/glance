# Glance backend

The backend for Glance (Even Realities G2 hackathon, Track 01 Messaging and
News). It collects Telegram messages through our own bot, keeps a digest the
glasses app renders one card at a time, and serves live HyperLiquid prices
plus price alerts. It is a single Node file with no dependencies beyond
Node itself (v24 on the build VM), so there is nothing to install after a
VM restart.

## What it does

- Long-polls the Telegram Bot API with getUpdates and a 50 second timeout.
  Short interval polling is never used; Telegram queues updates for up to
  24 hours, and the update offset is persisted, so a restart loses nothing
  and delivery stays near instant.
- The bot token is never in this repo, in code, or in logs. Every Bot API
  call goes through the secure vault connector helper
  (~/workspace/custom-connectors/custom.telegram-bot/bin/telegram_api.py),
  which resolves the token at request time. The bot is @GlanceDigestBot.
- Incoming messages from chats the bot is in are stored in data/digest.json
  with sender, full text, first line, timestamp, and an urgency tag
  (simple keyword heuristic: high, medium, normal).
- Prices: every 60 seconds it reads the HyperLiquid public info endpoint
  (POST https://api.hyperliquid.xyz/info, type metaAndAssetCtxs, no key,
  read only, no trading) for BTC, ETH, and SOL.
- Price alerts: if a watched coin moves 2 percent or more versus the
  previous check, an alert entry is appended to the digest so it flows to
  the glasses like a message, and the bot also posts it into the known demo
  chat when a chat id has been learned from updates.

## Endpoints (port 3000, whitelisted in app.json)

- GET /health: service status, digest size, last price refresh time.
- GET /digest: stored messages and price alerts, newest first. Each item
  has id, kind (message or price-alert), sender, text, firstLine,
  timestamp, and urgency, the shape the glasses UI renders as one card
  per message.
- GET /prices: latest prices as { updatedAt, coins: [{ symbol, markPx,
  prevDayPx, change24hPct }] } for BTC, ETH, SOL.

## State files (all inside this folder, never /tmp)

- data/state.json: Telegram update offset, last checked prices, and the
  known demo chat id. Written atomically on every poll cycle.
- data/digest.json: the digest store, capped at the newest 200 entries.
- logs/backend.log: supervisor and service log.

Both data files are runtime state and are excluded from git.

## Start, stop, check

Preferred on this VM: the supervisor script (the VM has no systemd user
bus, so the unit below cannot be enabled here; the script gives the same
restart on failure behaviour).

```sh
cd ~/workspace/even-realities-entry/backend
nohup ./run.sh >/dev/null 2>&1 &     # start under the supervisor
tail -f logs/backend.log            # watch it work
curl http://localhost:3000/health   # check it answers
pkill -f "node server.js"           # stop the service (supervisor restarts it)
pkill -f "run.sh"                   # stop the supervisor too
```

On a machine with a systemd user bus, the unit in this folder is the
equivalent:

```sh
cp glance-backend.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now glance-backend
systemctl --user status glance-backend
journalctl --user -u glance-backend -f
```

## First live message test

The bot only receives messages from chats it has been added to. If
/digest is empty, send one /start message to @GlanceDigestBot in Telegram;
the next long-poll cycle (at most 50 seconds) stores it, sets the known
chat id used by price alerts, and it appears in GET /digest.

## Hosting decision (recorded 24 Nov 2026)

The backend is hosted on this always-on build VM, under the supervisor
above, and stays here through Demo Day on 3 Dec 2026. Reasoning:

- The demo path is the Even Hub simulator on this same VM, and app.json
  already whitelists http://localhost:3000, so the demo and the recorded
  video need no public host at all.
- This VM is on 24 hours a day and free. A sleeping free-tier host is
  ruled out by the project latency rule: a host that sleeps for 50 plus
  seconds on first hit (the Render free tier behaviour we already know
  from MainImage Pass) would make the digest feel broken in front of
  judges, and no paid host is approved.
- Restart safety comes from the supervisor plus state in project files:
  after any VM restart, run.sh brings the backend back and the persisted
  offset resumes Telegram delivery without losing messages.
- One contingency: if the DoraHacks submission form (checked 27 to 28
  Nov) requires a public backend URL, a public hostname must be pointed
  at this VM and added to the app.json whitelist next to localhost before
  submitting. The host itself does not change.
