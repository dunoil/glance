import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { paginate } from './paginate'

// Glance glasses UI, 25 Nov 2026.
// Reads the live backend (whitelisted http://localhost:3000):
//   GET /digest  one card per Telegram message
//   GET /prices  one Market card per watched coin (BTC, ETH, SOL, HYPE, XRP)
//   POST /draft  AI draft reply for the selected message (Gemini, backend only)
//   POST /send   one tap send of the draft through the Telegram bot
//   POST /voice  transcribe a voice reply (G2 mic PCM s16le 16 kHz mono,
//     wrapped as WAV; Gemini STT on the backend, key stays in the vault)
// Navigation on G2: tap advances, and on a message card tap opens its draft
// card, tap on the draft card sends it. Swipe down from a draft card opens
// the voice reply card: tap to record, tap again to stop, then a confirm
// card shows the transcript and tap sends it. Swipe up (scroll top) goes
// back, swipe down (scroll bottom) moves to the next card. Double tap exits.

const BACKEND = 'http://localhost:3000'
const BODY_W = 576
const BODY_H = 240
const BODY_PAD = 4
const INNER_W = BODY_W - 2 * BODY_PAD
const INNER_H = BODY_H - 2 * BODY_PAD

interface DigestItem {
  id: string
  kind: string
  chatId: number | null
  sender: string
  text: string
  firstLine: string
  timestamp: string
  urgency: string
}
interface Coin { symbol: string; markPx: number; change24hPct: number }

type CardKind = 'home' | 'message' | 'draft' | 'sent' | 'market' | 'info' | 'voice' | 'confirm'
interface Card { kind: CardKind; text: string; item?: DigestItem; draft?: string }

let cards: Card[] = [{ kind: 'home', text: 'Glance\n\nLoading your Telegram digest...' }]
let current = 0

// Voice recording state lives here, above the container setup, because
// pagerLabel() reads `recording` during startup and a `let` declared
// below it would throw a temporal-dead-zone error and blank the display.
let recording = false
let pcmChunks: Uint8Array[] = []
let pcmBytes = 0
let recordTimer: number | null = null
let recordStartedAt = 0

function fmtPrice(n: number): string {
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(n)
}
function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function messageCard(item: DigestItem, idx: number, total: number): string {
  const tag = item.urgency === 'high' ? '[URGENT] ' : item.urgency === 'medium' ? '[soon] ' : ''
  const body = (item.text || item.firstLine || '').slice(0, 220)
  return `Message ${idx + 1} of ${total}  ${tag}\nFrom: ${item.sender}  ${fmtTime(item.timestamp)}\n\n${body}\n\nTap: draft reply  -  Swipe down: next`
}
function marketCard(coin: Coin): string {
  const sign = coin.change24hPct >= 0 ? '+' : ''
  return `Market  -  HyperLiquid\n\n${coin.symbol}  $${fmtPrice(coin.markPx)}\n24h: ${sign}${coin.change24hPct.toFixed(2)}%\n\nRead only. No trading.\nTap: next card`
}

async function fetchJson(path: string, init?: RequestInit): Promise<any> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(BACKEND + path, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally { clearTimeout(t) }
}

async function loadCards() {
  let items: DigestItem[] = []
  let coins: Coin[] = []
  try { const d = await fetchJson('/digest'); items = (d.items || []).filter((i: DigestItem) => i.kind !== 'sent') } catch { /* fallback below */ }
  try { const p = await fetchJson('/prices'); coins = p.coins || [] } catch { /* optional */ }
  if (!items.length) {
    cards = [
      { kind: 'home', text: 'Glance\n\nNo messages in your digest yet.\nSend a message to @GlanceDigestBot and it will appear here.\n\nTap: market cards' },
      ...coins.map((c): Card => ({ kind: 'market', text: marketCard(c) })),
    ]
    if (!coins.length) cards.push({ kind: 'info', text: 'Glance\n\nBackend unreachable.\nCheck http://localhost:3000/health' })
    return
  }
  const built: Card[] = [
    { kind: 'home', text: `Glance: your Telegram digest\n\n${items.length} message${items.length === 1 ? '' : 's'} waiting.\nOne card at a time.\n\nTap: first message` },
  ]
  items.slice(0, 10).forEach((item, i) => built.push({ kind: 'message', text: messageCard(item, i, Math.min(items.length, 10)), item }))
  coins.forEach((c) => built.push({ kind: 'market', text: marketCard(c) }))
  built.push({ kind: 'info', text: 'Glance\n\nEnd of digest.\nMarket cards: BTC, ETH, SOL, HYPE, XRP from HyperLiquid.\n\nDouble tap: exit' })
  cards = built
}

// Paginate a card text to the display box; most cards fit one page.
function cardPages(card: Card): string[] {
  return paginate(card.text, { width: INNER_W, height: INNER_H })
}

const bridge = await waitForEvenAppBridge()
await loadCards()
current = 0

const body = new TextContainerProperty({
  xPosition: 0, yPosition: 0, width: BODY_W, height: BODY_H,
  borderWidth: 0, borderColor: 5, paddingLength: BODY_PAD,
  containerID: 1, containerName: 'body', content: cardPages(cards[0])[0] ?? '', isEventCapture: 1,
})
const pager = new TextContainerProperty({
  xPosition: 0, yPosition: 250, width: 576, height: 30,
  borderWidth: 0, borderColor: 5, paddingLength: 4,
  containerID: 2, containerName: 'pager', content: pagerLabel(), isEventCapture: 0,
})
const created = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({ containerTotalNum: 2, textObject: [body, pager] }),
)
if (created !== 0) console.error('createStartUpPageContainer failed:', created)

function pagerLabel() {
  const c = cards[current]
  let hint = 'tap: next'
  if (recording) hint = 'tap: STOP recording'
  else if (c?.kind === 'message') hint = 'tap: draft'
  else if (c?.kind === 'draft') hint = 'tap: SEND'
  else if (c?.kind === 'voice') hint = 'tap: record'
  else if (c?.kind === 'confirm') hint = 'tap: SEND'
  return `${current + 1} / ${cards.length}  -  ${hint}  -  swipe up: prev  -  double-tap: exit`
}

// ---------- Voice replies (G2 mic, official asr pattern) ----------
// The mic emits PCM s16le @ 16 kHz mono while bridge.audioControl(true)
// is on; each audioEvent delivers a chunk. We collect chunks, wrap them
// as a WAV, and POST it to /voice for Gemini transcription. Nothing is
// sent to Telegram until the user taps SEND on the confirm card.
const VOICE_MAX_SECONDS = 30
const VOICE_MIN_BYTES = 8000 // about 0.25 s of audio; less means no speech

function pcmToWav(pcm: Uint8Array, sampleRate = 16000): Uint8Array {
  const out = new Uint8Array(44 + pcm.length)
  const view = new DataView(out.buffer)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true); writeStr(8, 'WAVE')
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  writeStr(36, 'data'); view.setUint32(40, pcm.length, true)
  out.set(pcm, 44)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)))
  }
  return btoa(bin)
}

function listeningText(): string {
  const secs = Math.floor((Date.now() - recordStartedAt) / 1000)
  return `Voice reply\n\nListening... ${secs}s / ${VOICE_MAX_SECONDS}s\nSpeak now.\n\nTap: STOP and transcribe\nDouble tap: exit`
}

async function startRecording() {
  if (recording || busy) return
  recordStartedAt = Date.now()
  pcmChunks = []
  pcmBytes = 0
  const ok = await bridge.audioControl(true).catch(() => false)
  if (!ok) {
    await showTransient('Glance\n\nMicrophone unavailable.\nThe glasses mic could not be opened.\nSwipe down to move on.')
    return
  }
  recording = true
  await showTransient(listeningText())
  recordTimer = window.setInterval(() => {
    if (!recording) return
    const secs = Math.floor((Date.now() - recordStartedAt) / 1000)
    if (secs >= VOICE_MAX_SECONDS) { stopRecording().catch(e => console.error(e)); return }
    showTransient(listeningText()).catch(e => console.error(e))
  }, 1000)
}

async function stopRecording() {
  if (!recording) return
  recording = false
  if (recordTimer !== null) { clearInterval(recordTimer); recordTimer = null }
  await bridge.audioControl(false).catch(() => {})
  const voiceIdx = cards.findIndex(c => c.kind === 'voice')
  const item = voiceIdx >= 0 ? cards[voiceIdx].item : null
  if (pcmBytes < VOICE_MIN_BYTES) {
    await showTransient('Glance\n\nNo speech captured.\nSpeak closer to the glasses mic and try again.\n(In the simulator there is no microphone, so nothing is captured.)')
    return
  }
  if (!item) return
  busy = true
  try {
    await showTransient('Glance\n\nTranscribing your voice...')
    const total = new Uint8Array(pcmBytes)
    let off = 0
    for (const chunk of pcmChunks) { total.set(chunk, off); off += chunk.length }
    const wav = pcmToWav(total)
    const v = await fetchJson('/voice', { method: 'POST', body: JSON.stringify({ audioBase64: bytesToBase64(wav) }) })
    const transcript = String(v.transcript || '').trim()
    if (!v.ok || !transcript) throw new Error(v.error || 'transcription empty')
    const confirmCard: Card = {
      kind: 'confirm',
      item,
      draft: transcript,
      text: `Voice reply to ${item.sender}  (transcribed)\n\n"${transcript}"\n\nTap: SEND this reply\nSwipe down: discard`,
    }
    cards.splice(voiceIdx + 1, 0, confirmCard)
    await showCard(voiceIdx + 1)
  } catch {
    await showTransient('Glance\n\nTranscription failed. Nothing was sent.\nTap the voice card to try again.')
  } finally { busy = false }
}

let rendering: Promise<unknown> = Promise.resolve()
async function showCard(index: number) {
  if (index < 0 || index >= cards.length) return
  current = index
  const content = cardPages(cards[current])[0] ?? ''
  rendering = rendering.then(async () => {
    await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: 'body', content }))
    await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 2, containerName: 'pager', content: pagerLabel() }))
  })
  await rendering
  mirrorCompanion()
}

let busy = false
async function onTap() {
  // A tap while recording stops the recording from any card.
  if (recording) { await stopRecording(); return }
  if (busy) return
  const card = cards[current]
  if (!card) return
  if (card.kind === 'message' && card.item) {
    busy = true
    try {
      await showTransient('Glance\n\nDrafting a reply...')
      const d = await fetchJson('/draft', { method: 'POST', body: JSON.stringify({ id: card.item.id }) })
      const draftText = String(d.draft || 'Thanks, got it.')
      const draftCard: Card = {
        kind: 'draft',
        item: card.item,
        draft: draftText,
        text: `Draft reply to ${card.item.sender}${d.source === 'gemini' ? '  (AI: Gemini)' : '  (AI draft)'}\n\n"${draftText}"\n\nTap: SEND this reply\nSwipe down: voice reply`,
      }
      const voiceCard: Card = {
        kind: 'voice',
        item: card.item,
        text: `Voice reply to ${card.item.sender}\n\nTap to record (max ${VOICE_MAX_SECONDS}s).\nYour words are transcribed and shown for confirmation before anything is sent.\n\nTap: record\nSwipe down: next message`,
      }
      cards.splice(current + 1, 0, draftCard, voiceCard)
      await showCard(current + 1)
    } catch {
      await showTransient('Glance\n\nDraft failed. Backend unreachable.\nSwipe down for the next message.')
    } finally { busy = false }
    return
  }
  if (card.kind === 'voice' && card.item) {
    await startRecording()
    return
  }
  if ((card.kind === 'draft' || card.kind === 'confirm') && card.item && card.draft) {
    busy = true
    try {
      await showTransient('Glance\n\nSending...')
      const sent = await fetchJson('/send', { method: 'POST', body: JSON.stringify({ chatId: card.item.chatId, text: card.draft }) })
      if (!sent.ok) throw new Error('send failed')
      cards.splice(current + 1, 0, { kind: 'sent', text: `Sent via @GlanceDigestBot\n\n"${card.draft}"\n\nDelivered to the demo chat.\nTap: next card` })
      await showCard(current + 1)
    } catch {
      await showTransient('Glance\n\nSend failed. Nothing was sent.\nSwipe down to move on.')
    } finally { busy = false }
    return
  }
  await showCard(current + 1)
}

async function showTransient(text: string) {
  rendering = rendering.then(async () => {
    await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: 'body', content: text }))
  })
  await rendering
  const mirror = document.getElementById('mirror')
  if (mirror) mirror.textContent = text
}

let cleanedUp = false
function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  if (recording) { recording = false; bridge.audioControl(false).catch(() => {}) }
  if (recordTimer !== null) { clearInterval(recordTimer); recordTimer = null }
  unsubscribe()
}

function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

const unsubscribe = bridge.onEvenHubEvent(event => {
  // Audio frames arrive on their own branch. Handle them first: a bare
  // audio event carries no sysEvent/textEvent, and the CLICK_EVENT
  // default must never be applied to it, or every frame would tap.
  const pcm = event.audioEvent?.audioPcm
  if (pcm && recording) {
    const chunk = pcm instanceof Uint8Array ? pcm : new Uint8Array(pcm as unknown as ArrayLike<number>)
    pcmChunks.push(chunk)
    pcmBytes += chunk.length
  }
  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)
  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    bridge.shutDownPageContainer(1); return
  }
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT) { showCard(current - 1).catch(e => console.error(e)); return }
  if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) { showCard(current + 1).catch(e => console.error(e)); return }
  if (sysType === OsEventTypeList.CLICK_EVENT || textType === OsEventTypeList.CLICK_EVENT) { onTap().catch(e => console.error(e)); return }
  if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) cleanup()
})
window.addEventListener('beforeunload', cleanup)

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main style="margin:auto;padding:24px;max-width:680px;box-sizing:border-box;">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h1 style="font-size:18px;font-weight:600;margin:0;">Glance</h1>
      <span id="pageCount" style="font-size:12px;color:#919191;"></span>
    </header>
    <pre id="mirror" style="background:#2E2E2E;border:1px solid #3E3E3E;border-radius:12px;padding:20px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:#E5E5E5;margin:0;"></pre>
    <footer style="font-size:12px;color:#7B7B7B;text-align:center;margin-top:16px;">
      Tap glasses: draft, then send - swipe down from a draft: voice reply - swipe up: previous - swipe down: next - double-tap: exit
    </footer>
  </main>
`
function mirrorCompanion() {
  const mirror = document.getElementById('mirror')
  const count = document.getElementById('pageCount')
  if (mirror) mirror.textContent = cardPages(cards[current])[0] ?? ''
  if (count) count.textContent = `${current + 1} / ${cards.length}`
}
mirrorCompanion()
