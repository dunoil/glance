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
   show all three cards, BTC, ETH and SOL, one at a time, and hold each
   card for several seconds so the price and the 24h percent are readable.
2. Do not leave Market as a leftover at the end. Story order: home, one
   message, draft, sent, then the full Market segment, so the two main
   features (messaging and market) carry equal weight.
3. Make sure the Market card prices are filled from live /prices at
   recording time, never an empty card. Check GET /prices right before
   recording and confirm BTC, ETH and SOL all carry a price and a 24h
   change.

## Shot list with target timings (total about 90 to 120 seconds)

- 0 to 8s: Home card, digest count, one card at a time.
- 8 to 25s: One message card, sender, first line, urgency tag.
- 25 to 45s: Draft card (Gemini draft), then one tap send, Sent card.
- 45 to 60s: Voice reply path (added 26 Nov), if it is in the final build.
- 60 to 90s: Market segment: BTC card held about 8s, ETH card about 8s,
  SOL card about 8s, each with live price and 24h change readable.
- 90 to 105s: End card, what Glance is, track, closing line.

## Recording notes

- The automated recording scripts live in docs/ (run-simulator-video.sh,
  click.py). Rework the click sequence to follow the shot list above
  instead of walking every message card.
- Verify the extracted frames after recording: home, message, draft,
  sent, and all three Market cards must each appear in the final cut
  before upload.
