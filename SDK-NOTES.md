# Even Hub SDK notes (from official docs, studied 20 Nov 2026, prep only)

Source: hub.evenrealities.com/docs (Your First App, App Submission and QA, video series index).

## Scaffold
- Route B (template): npx degit even-realities/evenhub-templates/minimal <app>
  Templates available: minimal, text-heavy, asr, image. For Glance, evaluate text-heavy for
  the digest reader and asr for the voice reply path at kickoff before choosing.
- Route A: Vite vanilla-ts by hand, npm install @evenrealities/even_hub_sdk, then evenhub init
  (init only creates app.json, it does not scaffold the project).
- Only Even-specific file is app.json at the project root; everything else is standard Vite.

## Core API pattern
- await waitForEvenAppBridge() before touching the glasses.
- Containers: CreateStartUpPageContainer for the first page, TextContainerUpgrade for
  content changes without flicker, rebuildPageContainer for layout changes.
- All input arrives through bridge.onEvenHubEvent: gestures, lifecycle, IMU, audio buffers.
  Trap: the capturing container decides which event envelope you receive.
- Device features available: microphone audio capture (glasses or phone mic), IMU, location,
  local storage, device and user info.

## Manifest (app.json) essentials
- package_id: reverse domain, lowercase, no hyphens or underscores, at least 2 segments,
  each segment starts with a lowercase letter (for example com.acme.weather).
- edition: "202601" in the current docs example. min_sdk_version must match the installed
  SDK (check with npm list @evenrealities/even_hub_sdk).
- entrypoint: index.html. permissions: []. supported_languages: ["en"].
- Network calls pass two gates: the app.json whitelist first, then CORS inside the WebView.
  Route API calls through our own backend and never bundle secrets or keys into the .ehpk,
  because published builds can be extracted by anyone.

## Run and package
- Dev: Vite dev server, then: evenhub-simulator http://localhost:5173
- Packaging and portal flow exist (upload, beta, review) but the hackathon submission is on
  DoraHacks with a public repo, README, and a demo video; the .ehpk is optional there.
- Official agent skill set exists (even-realities/everything-evenhub: template, cli-reference,
  build-and-deploy, device-features) if kickoff scaffolding wants it.

## Local toolchain status (verified 21 Nov 2026 on the Glint VM)

- The VM wipes global npm installs on restart (npm prefix is /usr, ephemeral). Both
  Even Hub tools were gone on 21 Nov and were reinstalled. Reinstall command, run
  this first on build week day 1 if `evenhub` is not found:
  npm i -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator
- After reinstall: evenhub CLI version 0.2.0, same as the 20 Nov install. `evenhub
  --help` works; commands include init, pack, qr, create, upload, ls, promote.
- evenhub-simulator: the Linux binary is present but is a GUI app and needs system
  libraries that a bare VM does not ship. Missing on 21 Nov (from ldd):
  libwebkit2gtk-4.1.so.0, libjavascriptcoregtk-4.1.so.0, libsoup-3.0.so.0.
  Fix on Ubuntu 24.04: sudo apt-get update, then
  sudo apt-get install -y libwebkit2gtk-4.1-0 (pulls the other two as dependencies).
  Caution from 21 Nov: the apt mirror on this VM is very slow (apt-get update
  fetched at about 23 kB/s and took 7 minutes; the install itself was fast once
  the lists were in). Run the library install BEFORE build week day 1, not
  during kickoff. Note the library is a system package, not an npm global, so
  it may survive VM restarts that wipe the npm tools; if the simulator fails
  with a shared library error, rerun the two apt commands above.
  Xvfb and xvfb-run are already installed, so the simulator runs headless with:
  xvfb-run evenhub-simulator http://localhost:5173
- Simulator start verdict (21 Nov 2026): WORKS on this VM. After the library
  install, ldd reported 0 missing libraries. Test: a static hello page served
  on http://localhost:5173, simulator launched with xvfb-run. It stayed
  running for the full 30 second test window and fetched the page twice
  (GET / 200 in the server log). Only warning: libEGL DRI3, no GPU
  acceleration under the virtual display, so rendering is software based.
  Expect the same during build week; it is enough for development and for
  recording the demo video.
- Pre-kickoff recheck (23 Nov 2026, about 14:25 WITA): the VM had restarted
  since 21 Nov and wiped BOTH the npm globals and the apt libraries this
  time. evenhub was not found, and the simulator failed with
  libwebkit2gtk-4.1.so.0 missing (plus libsoup-3.0 and
  libjavascriptcoregtk-4.1). Fixed before kickoff: npm i -g both packages
  again (CLI back at 0.2.0), then sudo apt-get update plus install
  libwebkit2gtk-4.1-0 (update took about 10 minutes on the slow mirror, one
  non fatal nodesource 403 warning, install exit 0). Re-verified the same
  way as 21 Nov: ldd 0 missing, simulator stayed up the full 20 second test
  window and fetched the page (GET / 200). Lesson: recheck the toolchain at
  the start of every build week day, because a VM restart can wipe the npm
  tools and the system libraries together.
- Kickoff recheck (23 Nov 2026, 16:00 WITA): the VM had restarted AGAIN
  between the 14:25 pre-kickoff fix and the 16:00 kickoff, and wiped both
  the npm globals and the apt libraries a second time. evenhub was not
  found, libwebkit2gtk-4.1.so.0 was missing. Fixed the same way during
  kickoff: npm i -g @evenrealities/evenhub-cli
  @evenrealities/evenhub-simulator (CLI back at 0.2.0), then sudo apt-get
  update plus install libwebkit2gtk-4.1-0 (slow mirror again, update took
  over 10 minutes). Lesson confirmed: the wipe can happen between any two
  runs, so recheck `which evenhub` and the simulator libraries at the
  start of EVERY build week day, not just day 1.

## Kickoff decisions (23 Nov 2026, 16:00 WITA)

- Template: text-heavy, from the official evenhub-templates repo. The
  digest reader is the core of Glance (one message at a time, tap next,
  swipe previous, double-tap exit), and text-heavy already wires exactly
  that with pagination through @evenrealities/pretext. minimal has no
  pagination or input handling; asr only adds mic capture with a stub STT
  that throws until a provider is wired, so it adds no working value on
  day 1. The asr mic-capture pattern (bridge.audioControl plus audioEvent
  PCM frames) is picked up on 26 Nov, the voice day, as documented in
  SDK-NOTES.md and PLAN.md.
- Installed SDK: @evenrealities/even_hub_sdk 0.0.10 (npm list, 23 Nov).
  app.json: package_id com.dunoil.glance, edition 202601,
  min_sdk_version 0.0.10, min_app_version 2.2.5 (the CLI bundled map value
  for SDK 0.0.10; verified with evenhub pack --sdk-ver 0.0.10, clean,
  no warning). Packing without --sdk-ver stamps 2.2.10 because the CLI
  defaults to the latest SDK 0.0.16, so always pass --sdk-ver 0.0.10
  until the project upgrades its SDK.
- Network whitelist: the network permission in app.json whitelists
  http://localhost:3000, the local dev backend port for build week. The
  production backend domain is added on 24 Nov when the backend host is
  decided (see BUILD-WEEK.md open questions); localhost stays for local
  development.
