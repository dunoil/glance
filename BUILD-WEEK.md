# Glance build week checklist (derived from PLAN.md)

Build week: 23 Nov 2026 16:00 WITA to 30 Nov 2026 03:59 WITA.
Internal submit target: 28 Nov 2026, one full day before the deadline.
Concept: Glance, Track 01 Messaging and News, Telegram digest with AI draft
replies and an optional voice reply path. See PLAN.md for the full concept and
the official rules summary. Toolchain status, reinstall commands, and simulator
notes live in SDK-NOTES.md; check there first on day 1.

## Before kickoff (prep, allowed before 23 Nov)

- [x] Registration on DoraHacks done (20 Nov 2026).
- [x] PLAN.md written: concept, rules summary, judging criteria, schedule.
- [x] SDK-NOTES.md written from the official docs, toolchain verified on the
      build machine, reinstall commands recorded.
- [x] Empty folder scaffold created (src/, backend/, assets/, docs/).
- [x] README.md first section states honestly what existed before 23 Nov.
- [x] Duan notified that 23 Nov kickoff needs one minute of his Telegram for
      the BotFather step (see 23 Nov list). Done: notified 21 Nov and again on
      23 Nov; Duan created the bot the same day.

## 23 Nov, kickoff (from 16:00 WITA)

- [x] Reinstall the evenhub CLI and simulator if the machine restarted and
      wiped them (exact commands in SDK-NOTES.md), then confirm versions.
      Done 23 Nov 16:00 WITA: the VM had restarted AGAIN between the 14:25
      pre-kickoff fix and kickoff, wiping both tools a second time.
      Reinstalled with npm i -g, CLI back at 0.2.0; apt-get update plus
      install libwebkit2gtk-4.1-0, both exit 0, ldd 0 missing libraries.
      Details in SDK-NOTES.md.
- [x] Create the Telegram bot via BotFather. NEEDS DUAN: this uses his
      Telegram account and takes about one minute. Save the bot token in the
      backend environment only, never in the app or the repo.
      Done 23 Nov: bot "Glance", username @GlanceDigestBot (first choice
      GlanceG2Bot was taken), token verified live with getMe the same day.
      Token itself is NOT stored in this repo; it goes through the secure
      vault connector (custom.telegram-bot). Privacy mode turned OFF by
      Duan in BotFather on 23 Nov and verified the same day: getMe now
      shows can_read_all_group_messages true, so the bot can read all
      messages in the demo group chats.
- [x] Decide the template: evaluate minimal, text-heavy (digest reader), and
      asr (voice reply) from the official templates, then scaffold into src/.
      Done 23 Nov: text-heavy chosen. The digest reader is the core of
      Glance and text-heavy already wires one-at-a-time paging with tap
      next, swipe previous, double-tap exit. minimal has no pagination;
      asr only adds mic capture with a stub STT that throws until a
      provider is wired. Scaffolded from the official template into the
      project and adapted to Glance (digest placeholder content, Glance
      title and header). The asr mic-capture pattern lands on 26 Nov.
- [x] Run evenhub init, set app.json: package_id in reverse domain format,
      edition and min_sdk_version matching the installed SDK (check with
      npm list @evenrealities/even_hub_sdk), entrypoint index.html,
      backend domain added to the network whitelist.
      Done 23 Nov: evenhub init run (it refuses to overwrite the
      template app.json, so the defaults were inspected via --output).
      app.json set: package_id com.dunoil.glance, edition 202601,
      min_sdk_version 0.0.10 (installed SDK per npm list),
      min_app_version 2.2.5 (CLI bundled map value for SDK 0.0.10),
      entrypoint index.html, network permission whitelisting
      http://localhost:3000, the local dev backend port. Verified with
      evenhub pack --sdk-ver 0.0.10, clean, no warning. Open: the
      production backend domain is added on 24 Nov when the host is
      decided; localhost stays for local development.
- [x] Wire the simulator to the Vite dev server and get a hello world page
      rendering on the virtual 576x288 display.
      Done 23 Nov: Vite dev server on http://localhost:5173, simulator
      launched under Xvfb on display :99, Glance hello world rendered on
      the virtual display (green monochrome, page 1/4). Proof:
      docs/simulator-hello-world-2026-11-23.png.
- [x] First commit of real app code, inside the build week window.
      Done 23 Nov: first commit pushed to the public repo
      https://github.com/dunoil/glance (see git log for the hash).

## 24 Nov, backend digest pipeline

- [x] Backend service skeleton in backend/ (runs locally, token in env only).
      Latency rule (owner concern 23 Nov): use long polling with a 50 second
      timeout, never short interval polling, and keep the backend always on
      with an auto restart supervisor. No sleeping free tier host for the demo
      or judging window; Telegram queues updates up to 24 hours, so a restart
      loses nothing as long as the offset is persisted.
      Done 24 Nov: backend/server.js, a single Node file with no
      dependencies (Node v24 on the VM), serving port 3000. Stronger than
      the token in env plan: the token is never in env, code, or logs at
      all; every Bot API call goes through the secure vault connector
      helper (custom.telegram-bot). Always on via the supervisor script
      backend/run.sh (restart on failure, logs in backend/logs/); a
      systemd user unit (backend/glance-backend.service) ships alongside
      for machines with a user bus, but this VM has none, so run.sh is
      the mechanism here. Hosting decision recorded below and in
      backend/README.md.
- [x] Telegram Bot API polling for the demo chats we control; message store.
      Done 24 Nov: getUpdates long polling with a 50 second timeout,
      offset persisted in backend/data/state.json after every cycle.
      Verified live the same day: the first poll ingested a real queued
      message (a stray /setprivacy text sent to the bot on 23 Nov during
      the BotFather step, sender Allin, chat 978207496), stored it in
      backend/data/digest.json, and a later full 50 second cycle completed
      cleanly with 0 updates. The offset and the digest both survived a
      supervisor restart in testing. The known chat id learned from that
      message is what price alerts will post into.
- [x] HyperLiquid price endpoint: poll the public info API (no key) for the
      watchlist (BTC, ETH, SOL), serve latest price and 24h change; price alert
      rule posts a bot alert into the demo chat when a watched coin crosses the
      move threshold (added 23 Nov, owner direction, see PLAN.md).
      Done 24 Nov: GET /prices serves live mark price and 24h change
      (computed from prevDayPx), refreshed every 60 seconds. Observed
      live on 24 Nov about 09:43 WITA: BTC $61,475 (+0.78 percent 24h),
      ETH $1,717.4 (+0.25 percent), SOL $72.463 (+2.80 percent). Alert
      rule implemented: a move of 2 percent or more versus the previous
      check appends an alert entry to the digest and posts it into the
      known demo chat via the bot. Not yet triggered live, because moves
      between 60 second checks stayed well under 2 percent during
      testing; the sendMessage leg is therefore still untested and gets
      its first live test with the 25 Nov send path verification.
- [x] Digest endpoint: new messages and channel posts as a one at a time list
      (sender, first line, urgency tag).
      Done 24 Nov: GET /digest returns the store newest first; each item
      carries id, kind, sender, full text, firstLine, timestamp, and an
      urgency tag from a keyword heuristic (high, medium, normal), the
      shape the glasses UI renders as one card per message. GET /health
      reports service status alongside.
- [ ] Glasses app reads the digest endpoint through the whitelisted domain.
      Backend side ready 24 Nov: endpoints live on http://localhost:3000,
      which app.json already whitelists, with CORS open for the WebView.
      The UI wiring itself is the 25 Nov work below.

## 25 Nov, AI drafts and glasses UI

- [x] Draft endpoint: short reply drafted per message with an LLM
      (Gemini free tier), keys on the backend only.
      Done early, 24 Nov evening WITA: POST /draft in backend/server.js
      calls Gemini and falls back to a local draft generator when Gemini
      is unavailable, so the glasses flow never breaks. Key handling:
      a free Gemini API key was created in Google AI Studio on 24 Nov
      (project Default Gemini Project, Free tier) and stored by Duan in
      the secure vault as the custom.gemini connector, never in the app,
      the repo, or env files. The backend calls Gemini through the
      vault helper (custom.gemini/bin/gemini_generate.py) when no
      GEMINI_API_KEY env var is set. Model note: gemini-2.0-flash and
      gemini-2.5-flash return 404 for new keys, so the working model is
      gemini-3.5-flash-lite. Verified live 24 Nov after the key was
      connected: POST /draft for the stored messages returned source
      gemini with real Gemini drafts, for example "Hey Allin! What's
      up?" for the "Hey" message. Drafts served before the key was
      connected were the fallback source, stated honestly in the UI
      as AI draft at the time.
- [x] Digest card and draft card in the glasses UI: tap to send the draft via
      the bot, swipe or next input to move on.
      Done 24 Nov evening: src/main.ts rewritten to load live cards from
      the backend. Tap on a message card fetches its draft and shows the
      draft card, tap on the draft card sends it, swipe down moves to
      the next card, swipe up goes back, double tap exits. Proven by
      automated simulator clicks (docs/click.py): message card, draft
      card, and sent card screenshots in docs/ dated 2026-11-24.
- [x] Market card in the glasses UI: one card per watched coin with price and
      24h change from the HyperLiquid price endpoint (added 23 Nov).
      Done 24 Nov evening: one Market card per coin after the message
      cards. Screenshot docs/simulator-market-card-2026-11-24.png shows
      BTC $59,940, 24h -2.17 percent, read only, no trading.
      EXPANDED 24 Nov night, owner direction: the watchlist grows from
      3 coins to 5: BTC, ETH, SOL, HYPE, XRP. HYPE is the native
      HyperLiquid token, XRP is a large market cap coin, and both are
      served by the same metaAndAssetCtxs endpoint. The backend
      WATCHLIST, GET /prices, the 2 percent price alert rule, and the
      glasses Market cards all cover the five coins (the UI builds one
      card per coin returned by /prices). Verified live the same night:
      /prices returned BTC $60,315 (-4.05 percent), ETH $1,690.9
      (-4.91 percent), SOL $69.758 (-8.75 percent), HYPE $62.11
      (-7.82 percent), XRP $0.92207 (-7.04 percent). Screenshots:
      docs/simulator-market-btc-2026-11-24.png and
      docs/simulator-market-hype-2026-11-24.png. Earlier entries in
      this checklist that mention the original 3 coin watchlist are
      the historical 24 Nov record and are superseded by this note.
- [x] Send path verified end to end in a demo chat we control.
      Done 24 Nov evening, first live sendMessage ever for this bot:
      POST /send delivered to chat 978207496, Telegram message_id 5,
      ok true. A second send happened through the actual glasses UI in
      the simulator (tap message, tap draft, tap send), Telegram
      message_id 6, stored in the digest as sent-6, with the Sent via
      @GlanceDigestBot card screenshot in docs/. The price alert
      sendMessage leg uses the same botApi sendMessage call and is now
      covered by this proof, although a 2 percent in 60 seconds alert
      trigger itself has still not occurred live.

## 26 Nov, voice path and polish

- [ ] Voice reply: mic audio captured through the SDK, sent to the backend
      for speech to text, transcript shown on a confirm card, one tap to send.
- [ ] Error states: empty inbox, backend unreachable, draft failed, STT failed.
- [ ] UX pass against the display constraints: one thing at a time, large
      targets for touch and the R1 ring, no walls of text.

## 27 Nov, package and demo

- [ ] Package the .ehpk with the evenhub CLI (optional for submission, do it
      anyway as a fallback artifact).
- [ ] Record the demo video in the simulator: at most 3 minutes, showing read,
      draft, one tap send, and the voice reply path. Follow
      docs/VIDEO-FINAL-PLAN.md: Duan's feedback on the 24 Nov draft video
      (24 Nov 2026) requires a full Market segment after the send flow,
      all five cards BTC, ETH, SOL, HYPE and XRP held several seconds each with
      live /prices values, never Market as a leftover at the end.
- [ ] Finish README setup instructions so a judge can run everything.
- [ ] Write the short description (problem, who it is for, how it works,
      track) and mirror it into docs/.

## 28 Nov, submit (internal hard deadline)

- [ ] Check the live DoraHacks submission form for any fields the plan does
      not list (see open questions below) before filling it in.
- [ ] Submit on DoraHacks: public repo link, demo video, description.
- [ ] Keep the backend running and reachable after submission, through
      Demo Day on 3 Dec, in case judges open the app.

## 29 Nov, buffer only

- [ ] Fix only submission blocking issues. No new features.
- [ ] Window closes 30 Nov 03:59 WITA.

## Coverage check against the official rules summary in PLAN.md

Covered by this plan:

- Public repo plus README with setup: README exists, setup section lands
  27 Nov.
- Demo video up to 3 minutes, simulator allowed: recording scheduled 27 Nov.
- Short description with problem, who it is for, how it works, and track:
  scheduled 27 Nov.
- Optional .ehpk package: scheduled 27 Nov.
- Submission on DoraHacks: scheduled 28 Nov.
- Judging criteria (Usefulness on G2 30%, Read and Write 25%, Technical
  execution 20%, UX for display and voice 15%, Business potential and
  safety 10%): the concept in PLAN.md maps to each criterion, and the daily
  targets above follow that mapping.
- Build during the hackathon, README states what existed before 23 Nov:
  covered by the README first section and by this checklist starting all
  code on 23 Nov.

Gaps and open questions (flagged 21 Nov 2026, from PLAN.md itself):

- Demo Day, 3 Dec in Dubai, remote participation OK, is mentioned in
  PLAN.md only as the payout reference point (USDT within 7 days of Demo
  Day). The plan does not say whether finalists must present or demo live,
  who presents, or what to prepare. Open question: check the DoraHacks page
  during build week and add a Demo Day task if one is needed.
- PLAN.md does not state where the demo video must be hosted or what file
  format is expected, only "up to 3 min (simulator allowed)". Open
  question: confirm on the DoraHacks submission form on 27 Nov before
  recording is finalised.
- PLAN.md lists the submission contents but not the exact DoraHacks form
  fields. Whether extra fields exist (for example team details, a bot
  handle, or a live backend URL) is unknown. Covered above by the 28 Nov
  form check, but it may need to move earlier if a field needs lead time.
- PLAN.md requires a backend with whitelisted domains but does not say
  where the backend is hosted or how long it must stay up. Judges may test
  after submission, so hosting must last at least through Demo Day, 3 Dec.
  Decide the host on 24 Nov when the backend skeleton is built.
  Decided 24 Nov: the backend is hosted on this always-on build VM under
  the run.sh supervisor, through Demo Day on 3 Dec. The demo path is the
  simulator on this same VM against http://localhost:3000, already
  whitelisted in app.json, so the demo needs no public host; the VM is on
  24 hours a day and free, and a sleeping free tier host is ruled out by
  the latency rule (50 plus second wake hits would break the digest in
  front of judges). Restart safety is the supervisor plus state persisted
  in backend/data/. Full reasoning in backend/README.md. One contingency:
  if the DoraHacks form checked on 27 to 28 Nov requires a public backend
  URL, a public hostname must be pointed at this VM and added to the
  app.json whitelist before submitting; the host itself does not change.
