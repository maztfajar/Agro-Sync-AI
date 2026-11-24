'use strict';
/**
 * AgroSync AI — Linux Local Server + 2-Way Telegram Bot + Cloudflare Tunnel Ready
 * Zero external dependencies (Node.js 18+ built-in modules only).
 * Pengembang: Fajar Wahyudi, S.Psi (Kapanewon Pengasih)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3080);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_HTML = path.join(__dirname, 'public', 'index.html');
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let state = null;
let telegramOffset = 0;
const sentReminders = new Set(); // key: YYYY-MM-DD|scheduleId
const msgToTaskMap = new Map();  // Telegram message_id -> scheduleId

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return state;
    }
  } catch (err) {
    console.error('[AgroSync] Gagal membaca state.json:', err.message);
  }
  return state;
}

function saveState(newState) {
  state = newState;
  state.updatedAt = Date.now();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[AgroSync] Gagal menyimpan state.json:', err.message);
  }
}

function getWibNow() {
  const now = new Date();
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  const d = new Date(wibMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return { dateKey: `${yyyy}-${mm}-${dd}`, timeKey: `${hh}:${mi}` };
}

function getTelegramTargets(st) {
  if (!st || !st.telegram) return [];
  const defaultId = (st.telegram.chatId || '').trim();
  const userIds = (st.users || []).map(u => (u.telegramChatId || '').trim()).filter(Boolean);
  return Array.from(new Set([defaultId, ...userIds].filter(Boolean)));
}

function findUserNameByChatId(st, chatId, fallbackName) {
  const cid = String(chatId || '').trim();
  const matched = (st && st.users || []).find(u => String(u.telegramChatId || '').trim() === cid);
  return matched ? matched.name : (fallbackName || 'Pengguna Telegram');
}

async function tgApi(token, method, body) {
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return resp.json();
}

async function broadcastTaskDone(token, task, doneBy, doneAt) {
  const targets = getTelegramTargets(state);
  const msg = `✅ *Tugas Selesai & Tersinkron ke Web!*\n• Tugas: ${task.title}\n• Unit: ${task.unitName}\n• Dikerjakan oleh: *${doneBy}* (${doneAt} WIB)`;
  for (const cid of targets) {
    try { await tgApi(token, 'sendMessage', { chat_id: cid, text: msg, parse_mode: 'Markdown' }); } catch (_) {}
  }
}

function markTaskDoneById(taskId, doneBy, timeKey) {
  if (!state || !Array.isArray(state.schedules)) return null;
  const task = state.schedules.find(s => s.id === taskId);
  if (!task) return null;
  task.done = true;
  task.doneBy = doneBy;
  task.doneAt = timeKey;
  saveState(state);
  return task;
}

// 1. Scheduler Pengingat Otomatis (cek tiap 30 detik)
async function checkScheduledReminders() {
  if (!state || !state.telegram || !state.telegram.enabled || !state.telegram.token) return;
  const token = state.telegram.token.trim();
  const targets = getTelegramTargets(state);
  if (!token || targets.length === 0) return;

  const { dateKey, timeKey } = getWibNow();
  for (const s of (state.schedules || [])) {
    if (s.done) continue;
    if (s.time === timeKey) {
      const remKey = `${dateKey}|${s.id}`;
      if (sentReminders.has(remKey)) continue;
      sentReminders.add(remKey);

      const text = `⏰ *Pengingat Otomatis AgroSync AI (${s.time} WIB)*\nUnit: ${s.unitName}\nTugas: *${s.title}*\nFrekuensi: ${s.freq}\n\n_Klik tombol di bawah atau balas pesan ini dengan "selesai" setelah dikerjakan agar otomatis tersinkron ke web._`;
      for (const cid of targets) {
        try {
          const res = await tgApi(token, 'sendMessage', {
            chat_id: cid,
            text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '✅ Tandai Selesai', callback_data: `done:${s.id}` }]]
            }
          });
          if (res && res.ok && res.result && res.result.message_id) {
            msgToTaskMap.set(`${cid}:${res.result.message_id}`, s.id);
          }
        } catch (err) {
          console.error('[Telegram] Gagal kirim pengingat:', err.message);
        }
      }
      console.log(`[Scheduler] Pengingat "${s.title}" dikirim ke ${targets.length} penerima (${timeKey} WIB).`);
    }
  }
}

// 2. Telegram 2-Way Listener (Long Polling — bekerja mulus di balik Cloudflare Tunnel)
let pollingActive = false;
async function pollTelegramUpdates() {
  if (pollingActive) return;
  if (!state || !state.telegram || !state.telegram.enabled || !state.telegram.token) return;
  pollingActive = true;
  const token = state.telegram.token.trim();
  try {
    const res = await tgApi(token, 'getUpdates', { offset: telegramOffset, timeout: 10 });
    if (res && res.ok && Array.isArray(res.result)) {
      const { timeKey } = getWibNow();
      for (const upd of res.result) {
        telegramOffset = upd.update_id + 1;

        // Case A: User clicked Inline Button "✅ Tandai Selesai"
        if (upd.callback_query && upd.callback_query.data && upd.callback_query.data.startsWith('done:')) {
          const taskId = upd.callback_query.data.slice(5);
          const fromChatId = upd.callback_query.message ? upd.callback_query.message.chat.id : upd.callback_query.from.id;
          const fallbackName = [upd.callback_query.from.first_name, upd.callback_query.from.last_name].filter(Boolean).join(' ');
          const doneBy = findUserNameByChatId(state, fromChatId, fallbackName);
          const task = markTaskDoneById(taskId, doneBy, timeKey);
          await tgApi(token, 'answerCallbackQuery', {
            callback_query_id: upd.callback_query.id,
            text: task ? 'Berhasil ditandai selesai & disinkronkan ke web!' : 'Tugas tidak ditemukan.'
          });
          if (task) await broadcastTaskDone(token, task, doneBy, timeKey);
          continue;
        }

        // Case B: User replied to reminder message or sent "/selesai <id>"
        if (upd.message && upd.message.text) {
          const chatId = upd.message.chat.id;
          const txt = upd.message.text.trim();
          const lower = txt.toLowerCase();
          const fallbackName = [upd.message.from.first_name, upd.message.from.last_name].filter(Boolean).join(' ');
          const doneBy = findUserNameByChatId(state, chatId, fallbackName);

          let taskId = '';
          if (lower.startsWith('/selesai ')) {
            taskId = txt.split(/\s+/)[1] || '';
          } else if (upd.message.reply_to_message && /(selesai|sudah|done|beres|ok)/i.test(lower)) {
            taskId = msgToTaskMap.get(`${chatId}:${upd.message.reply_to_message.message_id}`) || '';
          }

          if (taskId) {
            const task = markTaskDoneById(taskId, doneBy, timeKey);
            if (task) {
              await broadcastTaskDone(token, task, doneBy, timeKey);
            } else {
              await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Kode tugas tidak ditemukan atau sudah dihapus.' });
            }
          } else if (lower === '/jadwal') {
            const pending = (state.schedules || []).filter(s => !s.done).sort((a, b) => a.time.localeCompare(b.time));
            const listTxt = pending.length === 0
              ? '✅ Semua jadwal hari ini sudah selesai!'
              : '📋 *Jadwal Belum Selesai:*\n' + pending.map(s => `• *${s.time}* — ${s.title} (${s.unitName}) [/selesai ${s.id}]`).join('\n');
            await tgApi(token, 'sendMessage', { chat_id: chatId, text: listTxt, parse_mode: 'Markdown' });
          }
        }
      }
    }
  } catch (err) {
    // Silent retry on temporary network hiccup
  } finally {
    pollingActive = false;
  }
}

// 3. HTTP Server (Serves Web App + Sync API)
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, port: PORT, timeWib: getWibNow() }));
    return;
  }

  if (req.url === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state || {}));
    return;
  }

  if (req.url === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) req.destroy(); // Max 15MB (includes compressed photos)
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        saveState(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, updatedAt: state.updatedAt }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'JSON tidak valid' }));
      }
    });
    return;
  }

  // Serve index.html for root or any UI route
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    try {
      const html = fs.readFileSync(PUBLIC_HTML, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Gagal memuat public/index.html');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

loadState();
server.listen(PORT, HOST, () => {
  console.log(`[AgroSync AI] Server berjalan di http://${HOST}:${PORT}`);
  console.log(`[AgroSync AI] Siap dihubungkan ke Cloudflare Tunnel -> http://localhost:${PORT}`);
});

setInterval(checkScheduledReminders, 30 * 1000);
setInterval(pollTelegramUpdates, 4 * 1000);
