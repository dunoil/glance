'use strict';
/*
 * Glance backend: Telegram digest pipeline plus HyperLiquid prices.
 *
 * - Long-polls the Telegram Bot API (getUpdates, 50 second timeout) through
 *   the secure vault connector helper. The bot token never appears in this
 *   file, in arguments, or in logs; the helper resolves it at request time.
 * - Stores incoming messages in data/digest.json and persists the Telegram
 *   update offset in data/state.json, so a VM restart loses nothing
 *   (Telegram queues updates for up to 24 hours).
 * - Serves the glasses app on port 3000 (whitelisted in app.json):
 *     GET /health  service status
 *     GET /digest  stored messages and price alerts, newest first
 *     GET /prices  live HyperLiquid mark prices for BTC, ETH, SOL, HYPE, XRP
 * - Price alerts: on each refresh, a watched coin that moved 2 percent or
 *   more versus the previous check is appended to the digest and, when a
 *   demo chat id is known, also sent into that chat with the bot.
 *
 * No dependencies beyond Node itself. Run it through run.sh (supervisor)
 * or the glance-backend.service systemd user unit; see README.md.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const DIGEST_FILE = path.join(DATA_DIR, 'digest.json');
const TELEGRAM_HELPER = path.join(
  process.env.HOME || '/home/hatch',
  'workspace/custom-connectors/custom.telegram-bot/bin/telegram_api.py'
);

// Optional local .env (gitignored): GEMINI_API_KEY for AI drafts.
try {
  const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const PORT = Number(process.env.PORT || 3000);
const POLL_TIMEOUT_S = 50; // long polling, never short interval polling
const POLL_ERROR_BACKOFF_MS = 5000;
const PRICE_INTERVAL_MS = 60 * 1000;
const ALERT_THRESHOLD_PCT = 2;
const WATCHLIST = ['BTC', 'ETH', 'SOL', 'HYPE', 'XRP'];
const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const DIGEST_LIMIT = 200;

const URGENT_WORDS = [
  'urgent', 'asap', 'emergency', 'deadline', 'important', 'help',
  'call me', 'meeting', 'payment', 'invoice', 'down', 'error',
  'broken', 'failed', 'alert', 'now',
];
const MEDIUM_WORDS = ['tomorrow', 'later', 'please', 'when', '?'];

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- persistent state ----------

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(file, value) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const state = Object.assign(
  { offset: 0, lastPrices: {}, knownChatId: null, knownChatTitle: null },
  loadJson(STATE_FILE, {})
);
const digest = loadJson(DIGEST_FILE, []);
let priceCache = { updatedAt: null, coins: [] };

function saveState() {
  saveJson(STATE_FILE, state);
}

function saveDigest() {
  saveJson(DIGEST_FILE, digest);
}

function pushDigest(entry) {
  if (digest.some((item) => item.id === entry.id)) return false;
  digest.push(entry);
  while (digest.length > DIGEST_LIMIT) digest.shift();
  saveDigest();
  return true;
}

// ---------- Telegram through the vault helper ----------

function botApi(method, params) {
  return new Promise((resolve, reject) => {
    const args = [TELEGRAM_HELPER, method];
    if (params) args.push(JSON.stringify(params));
    execFile(
      'python3',
      args,
      { timeout: 90000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message || 'helper failed').trim()));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    );
  });
}

function urgencyFor(text) {
  const lower = text.toLowerCase();
  if (URGENT_WORDS.some((word) => lower.includes(word))) return 'high';
  if (MEDIUM_WORDS.some((word) => lower.includes(word))) return 'medium';
  return 'normal';
}

function senderName(msg) {
  if (msg.from) {
    const name = [msg.from.first_name, msg.from.last_name]
      .filter(Boolean)
      .join(' ');
    return name || msg.from.username || 'Unknown';
  }
  if (msg.sender_chat && msg.sender_chat.title) return msg.sender_chat.title;
  if (msg.chat && msg.chat.title) return msg.chat.title;
  return 'Unknown';
}

function handleUpdate(update) {
  state.offset = Math.max(state.offset, update.update_id + 1);
  const msg = update.message || update.channel_post;
  if (!msg) return;
  const text = msg.text || msg.caption || '';
  const firstLine = text ? text.split('\n')[0] : '(non-text message)';
  if (msg.chat && msg.chat.id) {
    state.knownChatId = msg.chat.id;
    state.knownChatTitle = msg.chat.title || msg.chat.first_name || null;
  }
  const added = pushDigest({
    id: 'tg-' + update.update_id,
    kind: 'message',
    chatId: msg.chat ? msg.chat.id : null,
    sender: senderName(msg),
    text,
    firstLine,
    timestamp: new Date((msg.date || 0) * 1000).toISOString(),
    urgency: urgencyFor(text),
  });
  if (added) log('digest: new message from', senderName(msg));
}

async function pollLoop() {
  log('telegram: long polling started, timeout', POLL_TIMEOUT_S + 's');
  for (;;) {
    try {
      const res = await botApi('getUpdates', {
        offset: state.offset,
        timeout: POLL_TIMEOUT_S,
        allowed_updates: ['message', 'channel_post'],
      });
      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) handleUpdate(update);
        saveState();
        log(
          'telegram: poll cycle complete,',
          res.result.length,
          'updates, next offset',
          state.offset
        );
      } else {
        log('telegram: unexpected getUpdates response, retrying');
        await sleep(POLL_ERROR_BACKOFF_MS);
      }
    } catch (err) {
      log('telegram: poll error:', err.message);
      await sleep(POLL_ERROR_BACKOFF_MS);
    }
  }
}

// ---------- HyperLiquid prices and alerts ----------

async function fetchPrices() {
  const res = await fetch(HYPERLIQUID_INFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  });
  if (!res.ok) throw new Error('HyperLiquid HTTP ' + res.status);
  const [meta, ctxs] = await res.json();
  const bySymbol = {};
  meta.universe.forEach((asset, i) => {
    if (!WATCHLIST.includes(asset.name)) return;
    const ctx = ctxs[i];
    const mark = parseFloat(ctx.markPx);
    const prevDay = parseFloat(ctx.prevDayPx);
    bySymbol[asset.name] = {
      symbol: asset.name,
      markPx: mark,
      prevDayPx: prevDay,
      change24hPct: prevDay ? ((mark - prevDay) / prevDay) * 100 : 0,
    };
  });
  return WATCHLIST.map((symbol) => bySymbol[symbol]).filter(Boolean);
}

async function priceLoop() {
  for (;;) {
    try {
      const coins = await fetchPrices();
      priceCache = { updatedAt: new Date().toISOString(), coins };
      for (const coin of coins) {
        const prev = state.lastPrices[coin.symbol];
        if (typeof prev === 'number' && prev > 0) {
          const movePct = ((coin.markPx - prev) / prev) * 100;
          if (Math.abs(movePct) >= ALERT_THRESHOLD_PCT) {
            // Direction word, per the owner's wording: up is "moved",
            // down is "down" with a minus sign on the number.
            const direction = movePct >= 0 ? 'moved' : 'down';
            const signedPct =
              (movePct >= 0 ? '+' : '-') + Math.abs(movePct).toFixed(2);
            const text =
              'Price alert: ' +
              coin.symbol +
              ' ' +
              direction +
              ' ' +
              signedPct +
              '% since the last check, now $' +
              coin.markPx.toLocaleString('en-US');
            pushDigest({
              id: 'alert-' + coin.symbol + '-' + Date.now(),
              kind: 'price-alert',
              chatId: state.knownChatId,
              sender: 'Glance Market',
              text,
              firstLine: text,
              timestamp: new Date().toISOString(),
              urgency: 'high',
            });
            log('prices:', text);
            if (state.knownChatId) {
              try {
                await botApi('sendMessage', {
                  chat_id: state.knownChatId,
                  text,
                });
                log('prices: alert sent to chat', state.knownChatId);
              } catch (sendErr) {
                log('prices: alert send failed:', sendErr.message);
              }
            }
          }
        }
        state.lastPrices[coin.symbol] = coin.markPx;
      }
      saveState();
      log(
        'prices: refreshed',
        coins.map((c) => c.symbol + ' $' + c.markPx).join(', ')
      );
    } catch (err) {
      log('prices: refresh failed:', err.message);
    }
    await sleep(PRICE_INTERVAL_MS);
  }
}

// ---------- AI draft replies (Gemini free tier, fallback local) ----------

function fallbackDraft(item) {
  const text = (item.text || '').trim();
  const sender = (item.sender || 'there').split(' ')[0];
  const lower = text.toLowerCase();
  if (!text || text.startsWith('/')) return 'Hi ' + sender + ', thanks for your message. Got it, I will follow up shortly.';
  if (lower.includes('?')) return 'Hi ' + sender + ', thanks for asking. Let me check and I will get back to you shortly.';
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('deadline')) return 'Hi ' + sender + ', got it, this is urgent on my side too. I am on it now and will update you soon.';
  if (lower.includes('meeting')) return 'Hi ' + sender + ', thanks, that meeting time works for me. See you then.';
  if (lower.includes('hey') || lower.includes('hi') || lower.includes('hello')) return 'Hey ' + sender + ', good to hear from you. How can I help?';
  return 'Hi ' + sender + ', thanks for your message. Got it, I will follow up shortly.';
}

const GEMINI_HELPER = path.join(
  process.env.HOME || '/home/hatch',
  'workspace/custom-connectors/custom.gemini/bin/gemini_generate.py'
);

function extractGeminiText(data) {
  return data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts ? data.candidates[0].content.parts.map(p => p.text || '').join('').trim() : '';
}

function geminiViaHelper(prompt) {
  return new Promise((resolve, reject) => {
    execFile('python3', [GEMINI_HELPER, prompt, GEMINI_MODEL], { timeout: 70000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) { reject(new Error((stderr || err.message || 'gemini helper failed').trim().slice(0, 300))); return; }
      try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
    });
  });
}

async function geminiDraft(item) {
  const prompt = 'You draft a short reply on behalf of the recipient of a Telegram message, to be sent from smart glasses with one tap. Reply with ONLY the reply text, no quotes, no preamble. Keep it under 30 words, friendly and clear.\n\nSender: ' + item.sender + '\nMessage: ' + item.text;
  if (GEMINI_API_KEY) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 80, temperature: 0.4 } }),
    });
    if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
    return extractGeminiText(await res.json()) || null;
  }
  // No env key: use the secure vault connector helper (custom.gemini).
  // The key never appears in this process; the helper resolves it.
  const data = await geminiViaHelper(prompt);
  return extractGeminiText(data) || null;
}

const draftCache = new Map();
async function draftFor(item) {
  if (draftCache.has(item.id)) return draftCache.get(item.id);
  let draft = null; let source = 'fallback';
  try { draft = await geminiDraft(item); if (draft) source = 'gemini'; } catch (e) { log('draft: gemini failed:', e.message); }
  if (!draft) draft = fallbackDraft(item);
  const result = { id: item.id, draft, source, model: source === 'gemini' ? GEMINI_MODEL : null };
  draftCache.set(item.id, result);
  return result;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 65536) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ---------- HTTP API for the glasses app ----------

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, {});
    return;
  }
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'glance-backend',
        time: new Date().toISOString(),
        digestItems: digest.length,
        knownChatId: state.knownChatId,
        geminiConfigured: Boolean(GEMINI_API_KEY) || fs.existsSync(GEMINI_HELPER),
        draftSource: 'gemini-via-vault-helper',
        pricesUpdatedAt: priceCache.updatedAt,
      });
    } else if (url.pathname === '/digest') {
      sendJson(res, 200, { items: [...digest].reverse() });
    } else if (url.pathname === '/draft' && (req.method === 'GET' || req.method === 'POST')) {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const id = body.id || url.searchParams.get('id');
      const item = digest.find((d) => d.id === id) || (body.text ? { id: id || 'adhoc', sender: body.sender || 'Unknown', text: body.text } : null);
      if (!item) { sendJson(res, 404, { ok: false, error: 'message not found' }); return; }
      const result = await draftFor(item);
      sendJson(res, 200, { ok: true, ...result, geminiConfigured: Boolean(GEMINI_API_KEY) || fs.existsSync(GEMINI_HELPER) });
    } else if (url.pathname === '/send' && req.method === 'POST') {
      const body = await readBody(req);
      const chatId = body.chatId || body.chat_id || state.knownChatId;
      const text = (body.text || '').toString().trim();
      if (!chatId || !text) { sendJson(res, 400, { ok: false, error: 'chatId and text are required' }); return; }
      const tg = await botApi('sendMessage', { chat_id: chatId, text });
      if (tg && tg.ok) {
        pushDigest({ id: 'sent-' + (tg.result.message_id || Date.now()), kind: 'sent', chatId, sender: 'Glance (you)', text, firstLine: text.split('\n')[0], timestamp: new Date().toISOString(), urgency: 'normal' });
        log('send: message sent to chat', chatId, 'message_id', tg.result.message_id);
      }
      sendJson(res, tg && tg.ok ? 200 : 502, { ok: Boolean(tg && tg.ok), result: tg && tg.result ? { message_id: tg.result.message_id, chat_id: tg.result.chat && tg.result.chat.id, date: tg.result.date } : null, telegram: tg ? { ok: tg.ok, description: tg.description || null } : null });
    } else if (url.pathname === '/prices') {
      if (!priceCache.coins.length) {
        const coins = await fetchPrices();
        priceCache = { updatedAt: new Date().toISOString(), coins };
      }
      sendJson(res, 200, priceCache);
    } else {
      sendJson(res, 404, { ok: false, error: 'not found' });
    }
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  log('glance backend listening on port', PORT);
});

pollLoop().catch((err) => log('telegram: poll loop died:', err.message));
priceLoop().catch((err) => log('prices: price loop died:', err.message));
