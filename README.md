# Glance: your Telegram, answered from your glasses

An Even Realities G2 app for the Even Realities "Heads Up" hackathon on DoraHacks.
Track 01, Messaging and News. Also entered for the Best Telegram integration special prize.

## What existed before 23 Nov 2026 (honest pre-build-week statement)

The hackathon rules require the app to be built during build week,
23 Nov 2026 16:00 WITA to 30 Nov 2026 03:59 WITA. Before that window, only
preparation existed, and no app code of any kind:

- PLAN.md: concept, official rules summary, judging criteria, and the build week schedule.
- SDK-NOTES.md: study notes from the official Even Hub documentation, plus local
  toolchain verification results (which tools run on the build machine, and how to
  reinstall them if the machine restarts).
- BUILD-WEEK.md: the day by day build checklist derived from PLAN.md.
- This README.
- An empty folder scaffold (src/, backend/, assets/, docs/) with no code in it.

All application code, the backend, the glasses UI, and the demo will be written
inside the build week window. This section will be kept as is in the final
submission so judges can see exactly what predates the build.

## The app (to be built during build week)

One glance, one tap: your Telegram, answered from your glasses.

- Read: a backend connected to the Telegram Bot API collects new messages and
  channel posts from chats the user controls. The G2 shows a one at a time
  digest: sender, first line, urgency tag.
- Write: for each message the backend drafts a short reply with an LLM. The user
  sees the draft on the glasses and taps once to send it through the bot, or
  moves on to the next message.
- Voice (optional path): the user can dictate a reply instead. Mic audio goes to
  the backend for speech to text, and the transcript is shown for a one tap
  confirm before anything is sent.

The UI is designed for the G2 display (576x288, monochrome green, one thing at a
time) and for the judging weights: usefulness on G2, true read and write,
technical execution, UX for display and voice, and business potential and safety.

## Setup

Prerequisites: Node 20 or newer, npm, and the Even Hub tools
(`npm i -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator`).
On a fresh Ubuntu VM the simulator also needs
`sudo apt-get install -y libwebkit2gtk-4.1-0`; see SDK-NOTES.md, the VM
wipes the global npm tools and these libraries on restart, so recheck
them at the start of every build week day.

```sh
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

In a second terminal, point the simulator at the dev server:

```sh
xvfb-run evenhub-simulator http://localhost:5173
```

The app is the Vite web app in `src/` (official text-heavy template,
adapted for the Glance digest reader). The small backend lives in
`backend/` (lands 24 Nov). `app.json` at the project root is the Even
Hub manifest: package `com.dunoil.glance`, SDK 0.0.10, entrypoint
`index.html`, and the local backend `http://localhost:3000` on the
network whitelist. The production backend domain is added on 24 Nov
when the backend host is decided.

Packaging (optional for the DoraHacks submission, kept as a fallback
artifact):

```sh
npm run build
evenhub pack app.json dist --sdk-ver 0.0.10 --output glance.ehpk
```

## Submission contents (target: 28 Nov 2026)

- This public repo with setup instructions.
- Demo video, up to 3 minutes, recorded in the official simulator.
- Short description: problem, who it is for, how it works, track (in the
  DoraHacks submission and mirrored in docs/).
- Optional .ehpk package built with the evenhub CLI.
