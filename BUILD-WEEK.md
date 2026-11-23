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
      vault connector (custom.telegram-bot). Remaining small step before the
      24 Nov backend day: turn the bot privacy mode OFF in BotFather
      (/setprivacy, Disable) so the bot can read all messages in the demo
      group chats; getMe on 23 Nov showed can_read_all_group_messages false.
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

- [ ] Backend service skeleton in backend/ (runs locally, token in env only).
      Latency rule (owner concern 23 Nov): use long polling with a 50 second
      timeout, never short interval polling, and keep the backend always on
      with an auto restart supervisor. No sleeping free tier host for the demo
      or judging window; Telegram queues updates up to 24 hours, so a restart
      loses nothing as long as the offset is persisted.
- [ ] Telegram Bot API polling for the demo chats we control; message store.
- [ ] HyperLiquid price endpoint: poll the public info API (no key) for the
      watchlist (BTC, ETH, SOL), serve latest price and 24h change; price alert
      rule posts a bot alert into the demo chat when a watched coin crosses the
      move threshold (added 23 Nov, owner direction, see PLAN.md).
- [ ] Digest endpoint: new messages and channel posts as a one at a time list
      (sender, first line, urgency tag).
- [ ] Glasses app reads the digest endpoint through the whitelisted domain.

## 25 Nov, AI drafts and glasses UI

- [ ] Draft endpoint: short reply drafted per message with an LLM
      (Gemini free tier), keys on the backend only.
- [ ] Digest card and draft card in the glasses UI: tap to send the draft via
      the bot, swipe or next input to move on.
- [ ] Market card in the glasses UI: one card per watched coin with price and
      24h change from the HyperLiquid price endpoint (added 23 Nov).
- [ ] Send path verified end to end in a demo chat we control.

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
      draft, one tap send, and the voice reply path.
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
