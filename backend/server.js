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
 *     GET /prices  live HyperLiquid mark prices for BTC, ETH, SOL
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

const PORT = Number(process.env.PORT || 3000);
const POLL_TIMEOUT_S = 50; // long polling, never short interval polling
const POLL_ERROR_BACKOFF_MS = 5000;
const PRICE_INTERVAL_MS = 60 * 1000;
const ALERT_THRESHOLD_PCT = 2;
const WATCHLIST = ['BTC', 'ETH', 'SOL'];
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
            const text =
              'Price alert: ' +
              coin.symbol +
              ' moved ' +
              (movePct >= 0 ? '+' : '') +
              movePct.toFixed(2) +
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

// ---------- HTTP API for the glasses app ----------

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        pricesUpdatedAt: priceCache.updatedAt,
      });
    } else if (url.pathname === '/digest') {
      sendJson(res, 200, { items: [...digest].reverse() });
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
