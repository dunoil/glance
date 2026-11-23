# Even Realities Hackathon, entry plan (Glint, 20 Nov 2026)

## Facts (official DoraHacks page, read 20 Nov 2026)
- Build week: 23 Nov 12:00 Dubai time (16:00 WITA) to 29 Nov 23:59 Dubai time (30 Nov 03:59 WITA).
  RULE: build during the hackathon. Prep (registration, tooling, docs, this plan) happens before;
  app code is written inside the build week. README must state what existed before 23 Nov.
- Prizes: Grand $2,000 + 2 G2; each of 4 tracks 1st $1,250 + G2, 2nd $500; Best Telegram integration $1,000.
  One cash prize per project. Paid in USDT within 7 days of Demo Day (3 Dec, Dubai, remote OK).
- Submission: public repo + README with setup, demo video up to 3 min (simulator allowed),
  short description (problem, who for, how it works, track), optional .ehpk package. Submit on DoraHacks.
- Judging: Usefulness on G2 30%, Read and Write 25%, Technical execution 20%,
  UX for display and voice 15%, Business potential and safety 10%.
- Tech: web app (HTML/CSS/JS/TS) in a WebView in the Even Realities App, Even Hub SDK over BLE.
  Display 576x288 monochrome green per eye. Input: mic, touch, R1 ring. No camera, no speaker.
  Backend required for API calls (whitelist domains in app.json, never ship keys in the app).
  Speech-to-text is bring-your-own (raw mic audio from SDK). Google sign-in does not work in WebView.
  Tools: npm i -g @evenrealities/evenhub-cli and @evenrealities/evenhub-simulator, official minimal template.

## Concept: "Glance" (working title), Track 01 Messaging and News, Telegram
One glance, one tap: your Telegram, answered from your glasses.
- Read: the backend (Telegram Bot API, our own bot in demo chats we control) collects new messages
  and channel posts; the G2 app shows a one-at-a-time digest: sender, first line, urgency tag.
- Write: for each message the backend drafts a short reply with an LLM (Gemini free tier);
  on the glasses the user sees the draft and taps once to send it via the bot, or swipes to the next.
  Optional voice reply: mic audio to backend Whisper, transcript shown for one-tap confirm.
- Why it fits the rubric: a real glanceable moment (30%), true read and write with AI drafts and
  one-tap send (25%), end-to-end working integration on free APIs (20%), designed for 576x288
  one-thing-at-a-time UX (15%), no funds, no private data beyond the user's own demo chats (10%).
- Double shot: also eligible for the $1,000 Best Telegram integration special prize.

## Added 23 Nov 2026 (owner direction): HyperLiquid live prices as a data source
- Duan directed that Glance also read live prices from the HyperLiquid public API.
  Read only: no trading, no account, no API key. Verified live from the build VM on
  23 Nov: POST https://api.hyperliquid.xyz/info with type metaAndAssetCtxs returns
  mark/mid price, previous day price, and 24h volume for 235 perpetual assets.
- How it fits without diluting the Telegram core:
  - Market card in the glasses app: one glanceable card per watched coin (BTC, ETH,
    SOL by default) showing price and 24h change, fed by a backend price endpoint.
  - Price alerts through the bot: when a watched coin moves beyond a threshold, the
    bot posts an alert into the demo chat, and the alert flows through the normal
    digest like any other message. HyperLiquid data enters through Telegram, so the
    read and write story and the Best Telegram angle stay intact.
- Scope guard: one public endpoint, no auth, no new accounts. Lands inside the
  existing 24 Nov backend day and 25 Nov UI day; the 28 Nov submit target stands.

## Build week schedule (WITA)
- 23 Nov 16:00 kickoff: create Telegram bot via BotFather (needs Duan's Telegram, one minute),
  scaffold from the official template, wire simulator, hello-world on the virtual display.
- 24 Nov: backend digest pipeline (Bot API polling, message store, digest endpoint).
- 25 Nov: AI draft endpoint + glasses UI (digest card, draft card, approve/next input handling).
- 26 Nov: voice reply path (mic capture to backend STT to confirm card), polish, error states.
- 27 Nov: package .ehpk, record the 3-minute simulator demo, write README and DoraHacks description.
- 28 Nov: buffer, submit on DoraHacks. Hard internal deadline, one day before the real one.
