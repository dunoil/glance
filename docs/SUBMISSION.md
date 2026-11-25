# Glance: DoraHacks submission draft (prepared 25 Nov 2026)

Form: https://dorahacks.io/hackathon/even-realities/detail
Flow: Submit Build -> I Agree & Continue -> Build Submission modal
-> Create a new Build. Nothing filled or submitted yet as of 25 Nov.

## Fields

- Name of your Build: Glance
- Brief description: Your Telegram, answered from your glasses: a
  one-card-at-a-time digest with AI draft replies and live market
  cards on the Even Realities G2.
- Tags: AI, Crypto/Web3
- Track: Messaging & News (also entered for Best Telegram integration)
- Looking for teammates: No
- GitHub Repo: https://github.com/dunoil/glance
- Video: https://raw.githubusercontent.com/dunoil/glance/main/docs/video/glance-demo-final-2026-11-25.mp4
  (89 seconds, 1280x720. The form accepts YouTube, Vimeo, Loom, or a
  direct file such as .mp4. A YouTube upload on Duan's Google account
  remains the nicer option if he wants it before submitting.)
- X: https://x.com/dunoil
- Website / LinkedIn: leave blank (no project site; Duan's LinkedIn
  not on file for this project)
- Team Info: solo, @dunoil. Introduce your team: "Solo builder.
  Duan (@dunoil) built Glance end to end during build week:
  Telegram backend, Gemini drafts, HyperLiquid market cards, and the
  G2 UI."
- Contact Info (organisers only): NEEDS DUAN: Telegram @username
  (primary) and one backup contact (Discord username, WhatsApp
  number, or WeChat ID).

## Describe your Build (long description)

Glance is your Telegram, answered from your glasses.

Problem: phones pull us out of the moment. On the Even Realities G2,
Glance turns Telegram into a one-card-at-a-time digest: sender, first
line, and an urgency tag, readable at a glance. No phone in your hand,
no endless feed, just the messages that matter, in the order they
arrived.

How it works: a small Node backend (no external dependencies) polls
the Telegram Bot API with a 50 second long poll, persists its offset
across restarts, and stores messages as a digest. For each message,
Gemini drafts a short reply; the draft appears on its own card on the
glasses, and one tap sends it through the Glance Telegram bot into
the same chat. Nothing is ever sent without the user's confirmation.
Live read-only prices from the HyperLiquid public API (BTC, ETH, SOL,
HYPE, XRP) appear as one Market card per coin with its 24h change,
and a move of 2 percent or more between checks flows into the digest
as a price alert.

Key features:
- Telegram digest on G2: one card at a time, sender, first line,
  urgency tag.
- AI draft replies (Gemini, gemini-3.5-flash-lite) with a local
  fallback draft generator, so the flow never breaks.
- One-tap send through @GlanceDigestBot, verified live with real
  Telegram deliveries (message_id 5, 6, 7, 9).
- Market cards for five coins with live prices and 24h change.
- Price alerts at 2 percent moves, verified live (HYPE -4.07
  percent, delivered to Telegram 25 Nov 2026).
- Built for the 576x288 monochrome green display, one thing at a
  time.

Tech stack: TypeScript and the Even Hub SDK (text-heavy template),
Node.js backend with no external dependencies, Telegram Bot API,
Google Gemini, HyperLiquid public API. Demo recorded in the official
Even Hub simulator.

Voice reply (dictate a reply, transcript shown for one-tap confirm)
was planned and honestly marked as not in this build yet at submit
time. UPDATE 25 Nov 2026, 19:00 WITA: the voice path is now BUILT
(a day early, at Duan's direction): G2 mic capture via the official
asr pattern, backend POST /voice with Gemini STT (verified live with
a real 10 s speech clip, transcribed in 5.7 s), confirm card before
send, g2-microphone permission. The VM simulator has no microphone,
so a full on-glasses recording still needs real G2 hardware or the
simulator on a PC with a mic. The Build text and video have NOT been
updated: Duan decided 25 Nov 2026 19:13 WITA to leave them as they
are for now ("biarkan dulu seperti sekarang"). The voice code stays
in the repo (commits 42f2b96, 313da6a); any Build edit or video
re-record needs his explicit approval first.

## Result: SUBMITTED 25 Nov 2026

- Confirmation shown: "Build Submitted! Your Build Glance has been
  submitted to hackathon Heads Up: Even Realities Hackathon by TVM
  Ventures & Daos Hub and is now under review. You can still edit
  this Build before judging."
- Build ID: 51846
- Build URL: https://dorahacks.io/build/51846
- Status verified on the hackathon builds page: Under Review.
- Tag used: Crypto/Web3 (single tag only, per Duan's choice).
- Contact: Telegram @cryptoyss, backup Discord jetz9851.
- Correction to the earlier warning: the confirmation itself says
  the Build can still be edited before judging, so the voice path
  can still be added to the Build after 26 Nov if Duan wants it.
  The earlier "only if declined" reading came from the modal text;
  the live confirmation overrides it.

## Edit warning (from the form itself)

Once submitted, the review team reviews the Build. The form states
the update path is: if a submission is declined, it can be updated
and resubmitted before the deadline. There is no statement that an
accepted submission can be freely edited afterwards. Before the
final submit, the Build can be saved as a Draft. Submitting now
therefore locks this build as it stands (without the voice path),
unless it is declined and resubmitted.
