# Glance final demo video plan (record 27 Nov 2026)

Final demo video for the DoraHacks submission: at most 3 minutes, recorded
in the official simulator, uploaded to YouTube, link in the submission.

## Owner feedback on the draft video (Duan, 24 Nov 2026)

Duan watched the draft video (docs/video/glance-demo-draft-2026-11-24.mp4,
33.6 seconds) and said the crypto prices feel absent. Frame check from the
main chat confirmed why: the Market card only appears at about second 30
of 33.6, only the BTC card ($59,952, 24h -2.15 percent) is ever shown,
because the recording spent its time in the message cards first (10 cards
total) and ended right as the BTC card appeared. The ETH and SOL cards
never appear at all.

## Required structure and pacing for the final video

1. Give the Market segment a clear, long enough share of the screen:
   show all five cards, BTC, ETH, SOL, HYPE and XRP, one at a time, and hold each
   card for several seconds so the price and the 24h percent are readable.
2. Do not leave Market as a leftover at the end. Story order: home, one
   message, draft, sent, then the full Market segment, so the two main
   features (messaging and market) carry equal weight.
3. Make sure the Market card prices are filled from live /prices at
   recording time, never an empty card. Check GET /prices right before
   recording and confirm BTC, ETH, SOL, HYPE and XRP all carry a price and a 24h
   change.

## Official final video requirements (Duan, locked 24 Nov 2026)

These are binding requirements for the final video, not suggestions.

1. CLEAN SCREEN ONLY. The draft video is a recording of the whole
   1280x800 simulator window: large empty black areas, simulator buttons
   and a mouse cursor are visible, and the glasses display takes only a
   small part of the frame, which looks messy. The final video MUST be
   cropped to the glasses display area only (the 576x288 display),
   scaled up neatly to fill the frame at the correct aspect ratio, with
   no simulator chrome, no cursor, and no empty black margins.
2. VOICE OVER REQUIRED. English narration explaining the flow (digest
   arrives, open a message, AI draft, send, then Market). The voice must
   sound natural and pass the project media QA rules: raw render speech
   rate 140 to 175 words per minute, real sentence pauses, tempo fitting
   never beyond 1.15x. Verify with silencedetect before calling it done.
3. Clean structure and pacing (extends the Market note above): home,
   one message, draft, sent, then the full Market segment with the BTC,
   ETH, SOL, HYPE and XRP cards each held for several seconds so prices are
   readable. Calm transitions between cards, never rushed.
4. Duration at most 3 minutes per the hackathon rules. A target of
   about 60 to 90 seconds is enough when every feature is represented.

The current draft video stays untouched as an internal archive. All of
the requirements above apply to the final video recorded on 27 Nov.

## Shot list with target timings (total about 60 to 90 seconds)

- 0 to 6s: Home card, digest count, one card at a time.
- 6 to 18s: One message card, sender, first line, urgency tag.
- 18 to 35s: Draft card (Gemini draft), then one tap send, Sent card.
- 35 to 48s: Voice reply path (added 26 Nov), if it is in the final build.
- 48 to 83s: Market segment, five cards (watchlist expanded to five
  coins on 24 Nov, owner direction): BTC, ETH, SOL, HYPE and XRP, each
  held about 7s with live price and 24h change readable.
- 83 to 92s: End card, what Glance is, track, closing line.

## Recording and post production notes

- The automated recording scripts live in docs/ (run-simulator-video.sh,
  click.py). Rework the click sequence to follow the shot list above
  instead of walking every message card.
- Crop in post with ffmpeg to the glasses display region of the
  simulator window, then scale to a clean 1152x576 (2x of 576x288) or
  1280x640 output. No simulator buttons, no cursor, no black margins
  in the exported file. Determine the exact crop rectangle from a test
  frame before the real recording.
- Owner feedback, 24 Nov 2026, on the simulator screenshots: the right
  side has too much empty space. He is right: in the 1280x800 window
  capture, the glasses content sits in the top of the right pane and
  the rest of that pane is empty black. Measured on
  docs/simulator-market-hype-2026-11-24.png, the green display text
  bounding box on the right pane is x 664 to 1229, y 10 to 279, so the
  576x288 display itself sits at about x 650, y 0 in the window.
  Starting crop for the final video: ffmpeg crop=576:288:650:0, to be
  confirmed against a test frame, then scaled to fill the output
  frame. The finished video frame is the display and nothing else, so
  the empty right pane disappears entirely.
- Crop VERIFIED 24 Nov night, owner asked for the fit to be fixed and
  checked: the exact display origin is x 660, y 0 (the 650 estimate
  was 10px off). Applied crop=576:288:660:0 with scale to 1152x576 to
  the draft recording and produced
  docs/video/glance-demo-clean-2026-11-24.mp4 as a cleaned preview.
  Frame checks at 3s, 12s, 20s, 26s and 31s: every card fills the
  frame edge to edge, no text clipped on any side, pager line fully
  visible, no simulator chrome, no empty margins. One leftover from
  the original recording cannot be cropped out: in a few frames a
  simulator hover tooltip overlaps the bottom pager line, because the
  pointer stayed parked on the Click button while recording. Fix for
  the final recording is in docs/click.py: after every click the
  pointer parks in the far corner, so no tooltip can appear.
- Narration script is written to fit the shot timings at a natural
  pace (about 150 words for a 60 to 90 second video at 140 to 175
  wpm). Record or generate the voice over as its own track, mix it
  over the cropped video, and run the media QA checks: raw render
  duration versus word count, silencedetect pause structure, no tempo
  fitting beyond 1.15x.
- Verify the extracted frames after recording: home, message, draft,
  sent, and all five Market cards must each appear in the final cut
  before upload, and a frame check must confirm the crop is clean.
