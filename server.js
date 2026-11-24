'use strict';
/**
 * AgroSync AI — Production Server v3.0 (Node.js 18+ Built-in, Zero Dependencies)
 * Kapanewon Pengasih, Kabupaten Kulon Progo, DIY
 * Fitur Server 24/7:
 *  1. Sinkronisasi Multi-Pengguna Real-Time (/api/state -> data/state.json) + Umur Unit Realtime WIB
 *  2. Kalender Hari Kerja Kantor (Senin–Jumat): Libur Sabtu, Minggu & Tanggal Merah Nasional (Analisis AI tetap berjalan)
 *  3. Bot Telegram 2-Arah Lengkap dengan Menu Tombol Interaktif:
 *     - 📸 Analisis Foto Pertumbuhan & Gejala Penyakit (cermat tanpa gejala manual + auto-update data unit)
 *     - 📝 Isi Form / Input Unit Baru & Update Ukuran (langsung masuk ke Web App)
 *     - 📅 Jadwal (Sudah & Belum Dikerjakan + tombol 1-klik Tandai Selesai)
 *     - 📊 Perkembangan Panen, Kurva & Dampak Lingkungan
 *     - 📄 Ekspor Laporan PDF (dikirim langsung sebagai file PDF di Telegram + /api/report/pdf)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3080);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_HTML = path.join(__dirname, 'public', 'index.html');
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Hari Libur Nasional Indonesia (2025 - 2027)
const INDONESIA_HOLIDAYS = {
  '2025-01-01': 'Tahun Baru Masehi', '2025-01-27': 'Isra Mikraj Nabi Muhammad SAW', '2025-01-29': 'Tahun Baru Imlek',
  '2025-03-29': 'Hari Suci Nyepi', '2025-03-31': 'Hari Raya Idul Fitri', '2025-04-01': 'Hari Raya Idul Fitri',
  '2025-04-18': 'Wafat Yesus Kristus', '2025-04-20': 'Hari Paskah', '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak', '2025-05-29': 'Kenaikan Yesus Kristus', '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-06': 'Hari Raya Idul Adha', '2025-06-27': 'Tahun Baru Islam 1447 H', '2025-08-17': 'Hari Kemerdekaan RI',
  '2025-09-05': 'Maulid Nabi Muhammad SAW', '2025-12-25': 'Hari Raya Natal',
  '2026-01-01': 'Tahun Baru 2026 Masehi', '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW', '2026-02-17': 'Tahun Baru Imlek 2577',
  '2026-03-19': 'Hari Suci Nyepi', '2026-03-20': 'Hari Raya Idul Fitri 1447 H', '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus', '2026-04-05': 'Hari Paskah', '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus', '2026-05-27': 'Hari Raya Idul Adha 1447 H', '2026-05-31': 'Hari Raya Waisak',
  '2026-06-01': 'Hari Lahir Pancasila', '2026-06-16': 'Tahun Baru Islam 1448 H', '2026-08-17': 'Hari Kemerdekaan RI',
  '2026-08-25': 'Maulid Nabi Muhammad SAW', '2026-12-25': 'Hari Raya Natal',
  '2027-01-01': 'Tahun Baru 2027 Masehi', '2027-01-05': 'Isra Mikraj Nabi Muhammad SAW', '2027-02-06': 'Tahun Baru Imlek 2578',
  '2027-03-09': 'Hari Suci Nyepi', '2027-03-10': 'Hari Raya Idul Fitri 1448 H', '2027-03-11': 'Hari Raya Idul Fitri 1448 H',
  '2027-03-26': 'Wafat Yesus Kristus', '2027-05-01': 'Hari Buruh Internasional', '2027-05-06': 'Kenaikan Yesus Kristus',
  '2027-05-16': 'Hari Raya Idul Adha 1448 H', '2027-05-20': 'Hari Raya Waisak', '2027-06-01': 'Hari Lahir Pancasila',
  '2027-06-06': 'Tahun Baru Islam 1449 H', '2027-08-17': 'Hari Kemerdekaan RI', '2027-08-15': 'Maulid Nabi Muhammad SAW',
  '2027-12-25': 'Hari Raya Natal'
};

const GROUNDED_AI_STANDARDS =
  'ACUAN RESMI WAJIB: (1) Lele/Ikan (SPO KKP, UNBARI, IPB Digitani): panen 60-90 hr (~24cm), pakan jam kantor, ganti air 10-20% air endapan 24 jam, probiotik+dolomit berkala, puasa 24 jam pra-panen; bintik putih/jamur=karantina+garam; menggantung/bau=puasa 6-12 jam+ganti air 15%+probiotik. ' +
  '(2) Maggot BSF (PPID KKP, PIAT UGM): panen larva 14-21 hr (~17-27mm), media lembab 60-70% gembur tidak becek, olah limbah dapur organik kantor. ' +
  '(3) Sayur/Kebun (BRMP Pertanian Banten): siram pagi&sore manfaatkan air kolam lele, pupuk kasgot, panen berkala Terong/Cabai/Tomat/Bayam.';

let state = null;
let telegramOffset = 0;
let telegramCommandsRegistered = false;
const sentReminders = new Set(); // YYYY-MM-DD|scheduleId
const aiRanDates = new Set();    // YYYY-MM-DD
const msgToTaskMap = new Map();  // chatId:messageId -> scheduleId
const tgSessions = new Map();    // chatId -> interactive form/photo wizard state

function isSafeExternalHttpsUrl(rawUrl) {
  try {
    const u = new URL(String(rawUrl || '').trim());
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return false;
    return true;
  } catch (_) { return false; }
}

function getWibNow(offsetDays) {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000 + (Number(offsetDays || 0) * 86400000));
  const yyyy = wib.getUTCFullYear();
  const mm = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wib.getUTCDate()).padStart(2, '0');
  const hh = String(wib.getUTCHours()).padStart(2, '0');
  const mi = String(wib.getUTCMinutes()).padStart(2, '0');
  return { dateKey: `${yyyy}-${mm}-${dd}`, timeKey: `${hh}:${mi}`, dayOfMonth: wib.getUTCDate(), dow: wib.getUTCDay() };
}

function diffDaysIso(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const a = Date.parse(startIso + 'T00:00:00Z');
  const b = Date.parse(endIso + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

function getIndonesiaWorkdayInfo(dateKeyInput) {
  const key = dateKeyInput || getWibNow(0).dateKey;
  const dt = new Date(key + 'T00:00:00Z');
  const dow = dt.getUTCDay();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const isWeekend = dow === 0 || dow === 6;
  const holidayName = INDONESIA_HOLIDAYS[key] || '';
  const isHoliday = isWeekend || Boolean(holidayName);
  let reason = '';
  if (holidayName && isWeekend) reason = `${dayNames[dow]} & ${holidayName}`;
  else if (holidayName) reason = `Tanggal Merah (${holidayName})`;
  else if (isWeekend) reason = `Akhir Pekan (${dayNames[dow]})`;

  let nextWorkdayLabel = '';
  for (let i = 1; i <= 10; i++) {
    const nd = new Date(dt.getTime() + i * 86400000);
    const nk = nd.toISOString().slice(0, 10);
    const ndow = nd.getUTCDay();
    if (ndow !== 0 && ndow !== 6 && !INDONESIA_HOLIDAYS[nk]) {
      nextWorkdayLabel = `${dayNames[ndow]}, ${nd.getUTCDate()}/${nd.getUTCMonth() + 1}/${nd.getUTCFullYear()}`;
      break;
    }
  }
  return { dateKey: key, dayName: dayNames[dow], isWeekend, isNationalHoliday: Boolean(holidayName), holidayName, isHoliday, reason, nextWorkdayLabel };
}

function clampToOfficeHours(timeStr, defaultTime = '07:30') {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(String(timeStr).trim())) return defaultTime;
  const parts = String(timeStr).trim().split(':');
  let hr = parseInt(parts[0], 10);
  let min = parseInt(parts[1], 10);
  if (isNaN(hr) || isNaN(min)) return defaultTime;
  let totalMin = hr * 60 + min;
  const minLimit = 7 * 60 + 30; // 07:30 WIB (awal jam kerja dinas kantor)
  const maxLimit = 16 * 60;     // 16:00 WIB (akhir jam kerja dinas kantor)
  if (totalMin < minLimit) totalMin = minLimit;
  else if (totalMin > maxLimit) totalMin = maxLimit;
  const outHr = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const outMin = String(totalMin % 60).padStart(2, '0');
  return `${outHr}:${outMin}`;
}

function syncRealtimeUnitAges(st) {
  if (!st || !Array.isArray(st.units)) return false;
  const today = getWibNow(0).dateKey;
  let changed = false;
  st.units.forEach(u => {
    if (!u.startDate) {
      const baseAge = Math.max(1, parseInt(u.ageDays, 10) || 1);
      u.startDate = getWibNow(-(baseAge - 1)).dateKey;
      changed = true;
    }
    const realAge = Math.max(1, diffDaysIso(u.startDate, today) + 1);
    if (u.ageDays !== realAge) {
      u.ageDays = realAge;
      changed = true;
    }
  });
  const lele = st.units.find(u => u.category === 'ternak');
  const realSimDay = lele ? lele.ageDays : (st.units.length > 0 ? Math.max(...st.units.map(u => u.ageDays || 1)) : 1);
  if (st.simDay !== realSimDay) {
    st.simDay = realSimDay;
    changed = true;
  }
  // Pastikan seluruh jadwal sesuai jam kerja kantor (07:30 - 16:00 WIB)
  if (Array.isArray(st.schedules)) {
    st.schedules.forEach(s => {
      const clamped = clampToOfficeHours(s.time, '07:30');
      if (s.time !== clamped) {
        s.time = clamped;
        changed = true;
      }
    });
    if (changed) st.schedules.sort((a, b) => a.time.localeCompare(b.time));
  }
  if (st.lastActiveDateWib && st.lastActiveDateWib !== today) {
    const wd = getIndonesiaWorkdayInfo(today);
    if (!wd.isHoliday && Array.isArray(st.schedules)) {
      st.schedules.forEach(s => {
        if (s.freq === 'Harian') { s.done = false; s.doneBy = ''; s.doneAt = ''; }
      });
    }
    st.lastActiveDateWib = today;
    changed = true;
  } else if (!st.lastActiveDateWib) {
    st.lastActiveDateWib = today;
    changed = true;
  }
  return changed;
}

function runServerAutoBackup(tag) {
  if (!state) return;
  try {
    const { dateKey } = getWibNow();
    const fname = tag ? `backup-${dateKey}-${tag}.json` : `backup-${dateKey}.json`;
    const fpath = path.join(BACKUP_DIR, fname);
    if (!tag && fs.existsSync(fpath)) return;
    fs.writeFileSync(fpath, JSON.stringify(state, null, 2), 'utf8');
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse();
    files.slice(14).forEach(old => { try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch (_) {} });
  } catch (err) { console.error('[Backup] Error:', err.message); }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (syncRealtimeUnitAges(state)) saveState(state);
      return state;
    }
  } catch (err) {
    console.error('[AgroSync] Gagal membaca state.json:', err.message);
  }
  return state;
}

function saveState(newState) {
  state = newState;
  syncRealtimeUnitAges(state);
  state.updatedAt = Date.now();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    if (state.autoBackupEnabled !== false) runServerAutoBackup('');
  } catch (err) {
    console.error('[AgroSync] Gagal menyimpan state.json:', err.message);
  }
}

function addActivityLog(category, actor, action, detail) {
  if (!state) return;
  if (!Array.isArray(state.activityLogs)) state.activityLogs = [];
  const { dateKey, timeKey } = getWibNow();
  state.activityLogs.unshift({
    id: 'log_' + Date.now() + Math.floor(Math.random() * 999),
    timeStr: `${dateKey} ${timeKey} WIB`,
    category,
    actor,
    action,
    detail
  });
  if (state.activityLogs.length > 100) state.activityLogs = state.activityLogs.slice(0, 100);
}

function getTelegramTargets(st) {
  if (!st || !st.telegram) return [];
  const rawIds = String(st.telegram.chatId || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
  const userIds = (st.users || []).map(u => (u.telegramChatId || '').trim()).filter(Boolean);
  return Array.from(new Set([...rawIds, ...userIds].filter(Boolean)));
}

function findUserNameByChatId(st, chatId, fallbackName) {
  const cid = String(chatId || '').trim();
  const matched = ((st && st.users) || []).find(u => String(u.telegramChatId || '').trim() === cid);
  return matched ? matched.name : (fallbackName || 'Pengguna Telegram');
}

function getMainReplyKeyboard() {
  return {
    keyboard: [
      [{ text: '📸 Analisis Foto & Penyakit' }, { text: '📝 Isi Form / Input Unit' }],
      [{ text: '📅 Jadwal (Selesai & Belum)' }, { text: '📊 Panen, Kurva & Lingkungan' }],
      [{ text: '📄 Ekspor Laporan PDF' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function getMainInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📸 Analisis Foto Pertumbuhan & Gejala Penyakit', callback_data: 'menu:photo' }],
      [{ text: '📝 Isi Form / Tambah & Update Unit', callback_data: 'menu:form' }],
      [{ text: '📅 Jadwal (Sudah & Belum Dikerjakan)', callback_data: 'menu:schedule' }],
      [{ text: '📊 Perkembangan Panen, Kurva & Lingkungan', callback_data: 'menu:harvest' }],
      [{ text: '📄 Ekspor Laporan PDF', callback_data: 'menu:pdf' }]
    ]
  };
}

async function tgApi(token, method, body) {
  if (method === 'sendMessage' && body && typeof body.text === 'string' && body.text.length > 3800) {
    const text = body.text;
    const chunkSize = 3800;
    let lastRes = null;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      const subBody = Object.assign({}, body, { text: chunk });
      if (i + chunkSize < text.length) delete subBody.reply_markup;
      lastRes = await tgApi(token, 'sendMessage', subBody);
    }
    return lastRes;
  }
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    let data = await resp.json();
    if (!data.ok && body && body.parse_mode && method === 'sendMessage') {
      console.warn(`[Telegram tgApi] Retry sendMessage without parse_mode due to: ${data.description}`);
      const fallbackBody = Object.assign({}, body);
      delete fallbackBody.parse_mode;
      const resp2 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody)
      });
      data = await resp2.json();
    }
    if (!data.ok) {
      console.error(`[Telegram tgApi Error] ${method}:`, data.description);
    }
    return data;
  } catch (err) {
    console.error(`[Telegram tgApi Network Error] ${method}:`, err.message);
    return { ok: false, description: err.message };
  }
}

async function tgSendDocument(token, chatId, pdfBuffer, filename, caption) {
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendDocument`;
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);
  const resp = await fetch(url, { method: 'POST', body: form });
  return resp.json();
}

function startTyping(token, chatId, action = 'typing') {
  if (!token || !chatId) return () => {};
  tgApi(token, 'sendChatAction', { chat_id: chatId, action }).catch(() => {});
  const timer = setInterval(() => {
    tgApi(token, 'sendChatAction', { chat_id: chatId, action }).catch(() => {});
  }, 4000);
  return () => {
    try { clearInterval(timer); } catch (_) {}
  };
}

async function broadcastTelegram(token, text, extra) {
  const targets = getTelegramTargets(state);
  const results = [];
  for (const cid of targets) {
    try {
      const payload = Object.assign({ chat_id: cid, text, parse_mode: 'Markdown' }, extra || {});
      const r = await tgApi(token, 'sendMessage', payload);
      results.push({ cid, res: r });
    } catch (err) {
      console.error('[Telegram] Error kirim ke', cid, err.message);
    }
  }
  return results;
}

function markTaskDoneById(taskId, doneBy, timeKey) {
  if (!state || !Array.isArray(state.schedules)) return null;
  const task = state.schedules.find(s => s.id === taskId);
  if (!task) return null;
  task.done = true;
  task.doneBy = doneBy;
  task.doneAt = timeKey;
  addActivityLog('human', doneBy, 'Selesaikan Jadwal (Telegram)', `${task.title} (${task.unitName})`);
  saveState(state);
  return task;
}

// ==================== PURE NODE.JS PDF REPORT GENERATOR (ZERO DEPENDENCIES) ====================
function pdfEscape(str) {
  return String(str || '')
    .replace(/[^\x20-\x7E]/g, ch => {
      if (ch === '–' || ch === '—') return '-';
      if (ch === '•') return '*';
      if (ch === '×') return 'x';
      if (ch === '±') return '+/-';
      if (ch === '’' || ch === '‘') return "'";
      if (ch === '“' || ch === '”') return '"';
      return ' ';
    })
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapPdfText(text, maxChars) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function buildAgroSyncPdfBuffer(st) {
  const { dateKey, timeKey } = getWibNow();
  const wd = getIndonesiaWorkdayInfo(dateKey);
  const units = (st && Array.isArray(st.units)) ? st.units : [];
  const schedules = (st && Array.isArray(st.schedules)) ? st.schedules : [];
  const harvests = (st && Array.isArray(st.harvestHistory)) ? st.harvestHistory : [];
  const eco = (st && st.ecoStats) || { wasteKg: 0, waterLiters: 0, kasgotKg: 0 };
  const journal = (st && Array.isArray(st.aiJournal)) ? st.aiJournal : [];
  const doneCount = schedules.filter(s => s.done).length;

  const pages = [];
  let curOps = [];
  let y = 790;

  const startNewPage = () => {
    if (curOps.length > 0) pages.push(curOps.join('\n'));
    curOps = [];
    y = 790;
  };

  // ==================== HALAMAN 1: KOP RESMI, KPI, DIAGRAM SIRKULAR & GRAFIK ====================
  // Header Kop Resmi Kapanewon Pengasih
  curOps.push('BT /F2 12 Tf 0.05 0.10 0.15 rg 130 812 Td (PEMERINTAH KABUPATEN KULON PROGO) Tj ET');
  curOps.push('BT /F2 14 Tf 0.05 0.10 0.15 rg 130 798 Td (KAPANEWON PENGASIH) Tj ET');
  curOps.push('BT /F1 7.2 Tf 0.25 0.30 0.38 rg 130 786 Td (Alamat. Jalan Purbowinoto No.6, Pengasih, Pengasih, Kulon Progo 55652, Telp. \\(0274\\) 773320) Tj ET');
  curOps.push('BT /F1 6.8 Tf 0.05 0.40 0.70 rg 130 775 Td (Laman: https://pengasih.kulonprogokab.go.id/, Pos-el: pengasih@kulonprogokab.go.id) Tj ET');
  // Garis Kop Dinas Ganda (Tebal & Tipis)
  curOps.push('q 0.05 0.10 0.15 rg 36 766 523 1.8 re f Q');
  curOps.push('q 0.05 0.10 0.15 rg 36 763 523 0.6 re f Q');

  y = 746;
  const statusHari = wd.isHoliday ? 'Libur Kantor (' + wd.reason + ')' : 'Hari Kerja Kantor';
  curOps.push(`BT /F2 10.5 Tf 0.05 0.15 0.25 rg 42 ${y} Td (LAPORAN BULANAN PENGELOLAAN BUDIDAYA SIRKULAR TERPADU) Tj ET`);
  y -= 13;
  curOps.push(`BT /F1 8 Tf 0.35 0.40 0.50 rg 42 ${y} Td (Tanggal: ${wd.dayName}, ${dateKey} (${timeKey} WIB) | Status: ${statusHari} | Sistem: Zero-Waste Bioflok & BSF) Tj ET`);
  y -= 18;

  // 1. KPI Cards
  curOps.push(`BT /F2 10.5 Tf 0.02 0.47 0.34 rg 42 ${y} Td (1. RINGKASAN EKSEKUTIF & INDIKATOR LINGKUNGAN SIRKULAR) Tj ET`);
  y -= 12;

  const pctDone = schedules.length > 0 ? Math.round((doneCount / schedules.length) * 100) : 100;
  const kpis = [
    { label: 'Unit Aktif', val: `${units.length} Unit`, sub: 'Realtime WIB' },
    { label: 'Tugas Perawatan', val: `${doneCount}/${schedules.length}`, sub: `${pctDone}% Selesai` },
    { label: 'Sampah Terolah', val: `${Number(eco.wasteKg || 0).toFixed(1)} kg`, sub: 'Biokonversi BSF' },
    { label: 'Air Kolam Siram', val: `${Math.round(Number(eco.waterLiters || 0))} L`, sub: 'Daur Ulang Nutrisi' }
  ];

  const cardW = 124;
  kpis.forEach((kpi, idx) => {
    const cx = 42 + idx * (cardW + 8);
    curOps.push(`q 0.97 0.98 0.99 rg 0.85 0.88 0.92 RG 0.8 w ${cx} ${y - 36} ${cardW} 38 re B Q`);
    curOps.push(`q 0.05 0.59 0.41 rg ${cx} ${y - 2} ${cardW} 3 re f Q`);
    curOps.push(`BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${cx + 6} ${y - 12} Td (${pdfEscape(kpi.label)}) Tj ET`);
    curOps.push(`BT /F2 11 Tf 0.05 0.15 0.25 rg ${cx + 6} ${y - 24} Td (${pdfEscape(kpi.val)}) Tj ET`);
    curOps.push(`BT /F1 7 Tf 0.02 0.47 0.34 rg ${cx + 6} ${y - 33} Td (${pdfEscape(kpi.sub)}) Tj ET`);
  });
  y -= 52;

  // 2. DIAGRAM SIRKULAR ZERO-WASTE
  curOps.push(`BT /F2 10.5 Tf 0.02 0.47 0.34 rg 42 ${y} Td (2. DIAGRAM ALUR BUDIDAYA SIRKULAR TERPADU (ZERO-WASTE BIO-CYCLE)) Tj ET`);
  y -= 12;

  const dBoxY = y - 72;
  curOps.push(`q 0.98 0.99 0.99 rg 0.80 0.85 0.90 RG 0.8 w 42 ${dBoxY} 520 72 re B Q`);
  curOps.push(`q 0.05 0.59 0.41 rg 48 ${y - 10} 210 11 re f Q`);
  curOps.push(`BT /F2 7 Tf 1 1 1 rg 52 ${y - 7} Td (SIKLUS BIOLOGIS TERTUTUP - KAPANEWON PENGASIH) Tj ET`);

  // Diagram Nodes
  // Node 1: Sampah Organik
  curOps.push(`q 1 0.96 0.90 rg 0.85 0.55 0.05 RG 0.8 w 50 ${dBoxY + 36} 95 24 re B Q`);
  curOps.push(`BT /F2 7.5 Tf 0.65 0.35 0 rg 54 ${dBoxY + 50} Td (1. SAMPAH ORGANIK) Tj ET`);
  curOps.push(`BT /F1 6.5 Tf 0.3 0.3 0.3 rg 54 ${dBoxY + 41} Td (Sisa kantor Kapanewon) Tj ET`);

  // Connector 1 -> 2
  curOps.push(`q 0.55 0.60 0.65 RG 0.8 w 145 ${dBoxY + 48} m 175 ${dBoxY + 48} l S Q`);

  // Node 2: Maggot BSF
  curOps.push(`q 1 0.98 0.85 rg 0.80 0.60 0.05 RG 0.8 w 175 ${dBoxY + 36} 100 24 re B Q`);
  curOps.push(`BT /F2 7.5 Tf 0.60 0.45 0 rg 179 ${dBoxY + 50} Td (2. BIOPOND MAGGOT BSF) Tj ET`);
  curOps.push(`BT /F1 6.5 Tf 0.3 0.3 0.3 rg 179 ${dBoxY + 41} Td (Pengurai 2-3x bobot/hari) Tj ET`);

  // Connector 2 -> 3a
  curOps.push(`q 0.55 0.60 0.65 RG 0.8 w 275 ${dBoxY + 48} m 300 ${dBoxY + 48} l S Q`);

  // Node 3a: Pakan Lele
  curOps.push(`q 0.90 0.96 1 rg 0.1 0.5 0.8 RG 0.8 w 300 ${dBoxY + 36} 105 24 re B Q`);
  curOps.push(`BT /F2 7.5 Tf 0.05 0.4 0.7 rg 304 ${dBoxY + 50} Td (3a. LARVA TINGGI PROTEIN) Tj ET`);
  curOps.push(`BT /F1 6.5 Tf 0.3 0.3 0.3 rg 304 ${dBoxY + 41} Td (Protein 40-45% pemicu lele) Tj ET`);

  // Connector 3a -> 4a
  curOps.push(`q 0.55 0.60 0.65 RG 0.8 w 405 ${dBoxY + 48} m 425 ${dBoxY + 48} l S Q`);

  // Node 4a: Kolam Lele
  curOps.push(`q 0.88 0.97 1 rg 0.05 0.55 0.7 RG 0.8 w 425 ${dBoxY + 36} 130 24 re B Q`);
  curOps.push(`BT /F2 7.5 Tf 0.05 0.4 0.6 rg 429 ${dBoxY + 50} Td (4a. KOLAM LELE BIOFLOK) Tj ET`);
  curOps.push(`BT /F1 6.5 Tf 0.3 0.3 0.3 rg 429 ${dBoxY + 41} Td (Hemat pakan komersial 40%) Tj ET`);

  // Connector 2 down to 3b
  curOps.push(`q 0.55 0.60 0.65 RG 0.8 w 225 ${dBoxY + 36} m 225 ${dBoxY + 29} l S Q`);

  // Node 3b: Pupuk Kasgot
  curOps.push(`q 0.90 0.98 0.92 rg 0.1 0.65 0.3 RG 0.8 w 175 ${dBoxY + 7} 100 22 re B Q`);
  curOps.push(`BT /F2 7.5 Tf 0.05 0.5 0.2 rg 179 ${dBoxY + 20} Td (3b. PUPUK ORGANIK KASGOT) Tj ET`);
  curOps.push(`BT /F1 6.5 Tf 0.3 0.3 0.3 rg 179 ${dBoxY + 11} Td (Kaya hara makro/mikro tanah) Tj ET`);

  // Connector 3b -> 4b
  curOps.push(`q 0.55 0.60 0.65 RG 0.8 w 275 ${dBoxY + 18} m 300 ${dBoxY + 18} l S Q`);

  // Node 4b: Kebun Sayur
  curOps.push(`q 0.88 0.97 0.90 rg 0.05 0.55 0.25 RG 0.8 w 300 ${dBoxY + 7} 255 22 re B Q`);
  curOps.push(`BT /F2 7.5 Tf 0.05 0.45 0.2 rg 304 ${dBoxY + 20} Td (4b. KEBUN SAYUR TERPADU (Cabai, Terong, Sawi, Bayam)) Tj ET`);
  curOps.push(`BT /F1 6.5 Tf 0.3 0.3 0.3 rg 304 ${dBoxY + 11} Td (Dipupuk kasgot & disiram air kolam lele kaya nitrat (Daur Ulang Hidrologi)) Tj ET`);

  // Daur ulang air line
  curOps.push(`q 0.08 0.55 0.70 RG 0.8 w 490 ${dBoxY + 36} m 490 ${dBoxY + 29} l S Q`);

  y = dBoxY - 14;

  // 3. GRAFIK KESIAPAN PANEN PER UNIT (HORIZONTAL VECTOR BARS)
  curOps.push(`BT /F2 10.5 Tf 0.02 0.47 0.34 rg 42 ${y} Td (3. GRAFIK TINGKAT KESIAPAN PANEN PER UNIT BUDIDAYA (% PROGRES)) Tj ET`);
  y -= 14;

  units.forEach((u) => {
    const target = Math.max(1, u.targetDays || 30);
    const age = Math.max(0, u.ageDays || 0);
    const pct = Math.min(100, Math.round((age / target) * 100));
    const mUnit = u.category === 'maggot' ? 'mm' : 'cm';

    // Unit label
    curOps.push(`BT /F2 8.5 Tf 0.15 0.20 0.28 rg 42 ${y + 2} Td (${pdfEscape(u.name)} [${u.category.toUpperCase()}]) Tj ET`);
    curOps.push(`BT /F1 7.5 Tf 0.40 0.45 0.55 rg 42 ${y - 8} Td (Umur: ${age}/${target} hr | Ukuran: ${u.metric} ${mUnit}) Tj ET`);

    // Bar track
    const barX = 220;
    const barW = 260;
    const barH = 11;
    curOps.push(`q 0.92 0.94 0.96 rg ${barX} ${y - 6} ${barW} ${barH} re f Q`);

    // Bar fill
    let colorRg = '0.05 0.59 0.41'; // green
    if (u.category === 'ternak') colorRg = '0.08 0.55 0.70'; // cyan
    if (u.category === 'maggot') colorRg = '0.85 0.55 0.05'; // amber

    const fillW = Math.max(3, Math.round((barW * pct) / 100));
    curOps.push(`q ${colorRg} rg ${barX} ${y - 6} ${fillW} ${barH} re f Q`);

    // Percentage text
    curOps.push(`BT /F2 8 Tf 0.1 0.15 0.2 rg ${barX + barW + 10} ${y - 4} Td (${pct}%) Tj ET`);
    const statusTxt = pct >= 100 ? 'Siap Panen' : `${Math.max(0, target - age)} hr lagi`;
    curOps.push(`BT /F1 7 Tf 0.35 0.40 0.50 rg ${barX + barW + 42} ${y - 4} Td (${statusTxt}) Tj ET`);

    y -= 24;
  });

  // End of Page 1 -> Next Page
  startNewPage();

  // ==================== HALAMAN 2: EVALUASI DETAIL UNIT & JADWAL TIM ====================
  curOps.push('q 0.02 0.47 0.34 rg 36 784 523 38 re f Q');
  curOps.push('q 0.85 0.55 0.05 rg 36 781 523 3 re f Q');
  curOps.push('BT /F2 12 Tf 1 1 1 rg 46 802 Td (4. EVALUASI DETAIL PERKEMBANGAN UNIT VS STANDAR ACUAN RESMI) Tj ET');
  curOps.push('BT /F1 8.5 Tf 0.9 0.95 0.95 rg 46 790 Td (Rujukan: SPO Budidaya KKP, PPID KKP (BSF), PIAT UGM, & BRMP Pertanian Banten) Tj ET');

  y = 755;

  // Table header
  curOps.push(`q 0.05 0.59 0.41 rg 42 ${y} 520 16 re f Q`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 46 ${y + 5} Td (No) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 66 ${y + 5} Td (Nama Unit & Spesies) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 210 ${y + 5} Td (Umur / Target) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 290 ${y + 5} Td (Ukuran Saat Ini) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 380 ${y + 5} Td (Status / Kondisi) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 480 ${y + 5} Td (Kesiapan) Tj ET`);
  y -= 16;

  units.forEach((u, idx) => {
    const bg = idx % 2 === 0 ? '0.98 0.99 1' : '1 1 1';
    curOps.push(`q ${bg} rg 42 ${y - 2} 520 18 re f Q`);
    curOps.push(`q 0.90 0.92 0.94 RG 0.5 w 42 ${y - 2} 520 18 re S Q`);

    const target = Math.max(1, u.targetDays || 30);
    const age = Math.max(0, u.ageDays || 0);
    const pct = Math.min(100, Math.round((age / target) * 100));
    const mUnit = u.category === 'maggot' ? 'mm' : 'cm';

    curOps.push(`BT /F1 7.5 Tf 0.1 0.1 0.1 rg 46 ${y + 4} Td (${idx + 1}) Tj ET`);
    curOps.push(`BT /F2 7.5 Tf 0.1 0.1 0.1 rg 66 ${y + 4} Td (${pdfEscape(u.name.slice(0, 24))}) Tj ET`);
    curOps.push(`BT /F1 7.5 Tf 0.3 0.3 0.3 rg 210 ${y + 4} Td (Hr ${age}/${target}) Tj ET`);
    curOps.push(`BT /F2 7.5 Tf 0.1 0.4 0.2 rg 290 ${y + 4} Td (${u.metric} ${mUnit}) Tj ET`);
    curOps.push(`BT /F1 7 Tf 0.2 0.3 0.4 rg 380 ${y + 4} Td (${pdfEscape((u.statusNote || 'Kondisi Baik').slice(0, 20))}) Tj ET`);
    curOps.push(`BT /F2 7.5 Tf 0.05 0.5 0.3 rg 480 ${y + 4} Td (${pct}% (${pct >= 100 ? 'Panen' : 'Tumbuh'})) Tj ET`);

    y -= 18;
  });

  y -= 28;
  // 5. SCHEDULES RECAP TABLE
  curOps.push(`BT /F2 10.5 Tf 0.02 0.47 0.34 rg 42 ${y} Td (5. REKAPITULASI JADWAL PERAWATAN & TIM KERJA) Tj ET`);
  y -= 22;

  curOps.push(`q 0.08 0.55 0.70 rg 42 ${y} 520 16 re f Q`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 46 ${y + 5} Td (Jam WIB) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 100 ${y + 5} Td (Unit Sasaran) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 210 ${y + 5} Td (Aktivitas Perawatan) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 380 ${y + 5} Td (Frekuensi) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 1 1 1 rg 460 ${y + 5} Td (Status / Pelaksana) Tj ET`);
  y -= 16;

  schedules.slice(0, 11).forEach((s, idx) => {
    const bg = idx % 2 === 0 ? '0.98 0.99 1' : '1 1 1';
    curOps.push(`q ${bg} rg 42 ${y - 2} 520 16 re f Q`);
    curOps.push(`q 0.90 0.92 0.94 RG 0.5 w 42 ${y - 2} 520 16 re S Q`);

    const statusTxt = s.done ? `Selesai (${pdfEscape(s.doneBy || 'Tim')})` : 'Belum Dikerjakan';
    curOps.push(`BT /F2 7 Tf 0.1 0.1 0.1 rg 46 ${y + 4} Td (${s.time}) Tj ET`);
    curOps.push(`BT /F1 7 Tf 0.2 0.2 0.2 rg 100 ${y + 4} Td (${pdfEscape(s.unitName.slice(0, 18))}) Tj ET`);
    curOps.push(`BT /F1 7 Tf 0.1 0.1 0.1 rg 210 ${y + 4} Td (${pdfEscape(s.title.slice(0, 30))}) Tj ET`);
    curOps.push(`BT /F1 7 Tf 0.4 0.4 0.4 rg 380 ${y + 4} Td (${pdfEscape(s.freq)}) Tj ET`);
    curOps.push(`BT /F2 7 Tf ${s.done ? '0.05 0.5 0.2' : '0.7 0.2 0.1'} rg 460 ${y + 4} Td (${statusTxt}) Tj ET`);

    y -= 16;
  });

  y -= 22;

  // SIGNATURE BLOCK
  curOps.push(`q 0.98 0.99 0.99 rg 0.85 0.88 0.92 RG 0.8 w 330 ${y - 65} 230 65 re B Q`);
  curOps.push(`BT /F1 7.5 Tf 0.3 0.35 0.4 rg 345 ${y - 12} Td (Kapanewon Pengasih, Kabupaten Kulon Progo) Tj ET`);
  curOps.push(`BT /F2 7.5 Tf 0.1 0.15 0.2 rg 345 ${y - 22} Td (Pengelola Budidaya Sirkular AgroSync AI) Tj ET`);
  curOps.push(`BT /F2 8.5 Tf 0.05 0.45 0.3 rg 345 ${y - 48} Td (Fajar Wahyudi, S.Psi) Tj ET`);
  curOps.push(`BT /F1 7 Tf 0.4 0.45 0.5 rg 345 ${y - 58} Td (Dokumen Resmi Sistem Budidaya Mandiri) Tj ET`);

  if (curOps.length > 0) pages.push(curOps.join('\n'));

  // Assemble PDF 1.4 objects
  const objects = [];
  const addObj = body => { objects.push(body); return objects.length; };
  const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesKids = [];
  const pagesObjPlaceholderIdx = objects.length;
  addObj('PLACEHOLDER_PAGES');
  const pagesObjId = pagesObjPlaceholderIdx + 1;

  pages.forEach((streamText, pIdx) => {
    const footer = `\nBT /F1 8 Tf 0.45 0.50 0.58 rg 42 24 Td (AgroSync AI - Kapanewon Pengasih | Halaman ${pIdx + 1} dari ${pages.length}) Tj ET`;
    const fullStream = streamText + footer;
    const contentId = addObj(`<< /Length ${Buffer.byteLength(fullStream, 'utf8')} >>\nstream\n${fullStream}\nendstream`);
    const pageId = addObj(`<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pagesKids.push(`${pageId} 0 R`);
  });

  objects[pagesObjPlaceholderIdx] = `<< /Type /Pages /Kids [${pagesKids.join(' ')}] /Count ${pagesKids.length} >>`;
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

// ==================== 1. SCHEDULER PENGINGAT & ANALISIS AI (HARI KERJA / LIBUR) ====================
async function runScheduledJobs() {
  if (!state) return;
  if (syncRealtimeUnitAges(state)) saveState(state);

  const { dateKey, timeKey, dayOfMonth } = getWibNow();
  const wd = getIndonesiaWorkdayInfo(dateKey);

  // A. Kirim pengingat jadwal HANYA pada hari kerja (Senin-Jumat, bukan Sabtu/Minggu/Tanggal Merah)
  if (!wd.isHoliday && state.telegram && state.telegram.enabled && state.telegram.token) {
    const token = state.telegram.token.trim();
    const targets = getTelegramTargets(state);
    if (token && targets.length > 0) {
      for (const s of (state.schedules || [])) {
        if (s.done) continue;
        if (s.time === timeKey) {
          const remKey = `${dateKey}|${s.id}`;
          if (sentReminders.has(remKey)) continue;
          sentReminders.add(remKey);

          const text = `⏰ *Pengingat Otomatis AgroSync AI (${s.time} WIB)*\nUnit: ${s.unitName}\nTugas: *${s.title}*\nFrekuensi: ${s.freq}\n\n_Klik tombol di bawah atau balas "selesai" jika sudah dikerjakan agar otomatis tersinkron ke web._`;
          const sent = await broadcastTelegram(token, text, {
            reply_markup: { inline_keyboard: [[{ text: '✅ Tandai Selesai', callback_data: `done:${s.id}` }]] }
          });
          sent.forEach(item => {
            if (item.res && item.res.ok && item.res.result && item.res.result.message_id) {
              msgToTaskMap.set(`${item.cid}:${item.res.result.message_id}`, s.id);
            }
          });
          console.log(`[Scheduler] Pengingat "${s.title}" dikirim (${timeKey} WIB).`);
        }
      }
    }
  }

  // B. Analisis AI Terjadwal Hemat Token — TETAP BERJALAN meski Sabtu/Minggu/Tanggal Merah!
  const aiCfg = state.aiConfig || {};
  const reminderTime = (state.telegram && state.telegram.reminderTime) || '06:00';
  if (
    aiCfg.enabled &&
    aiCfg.apiKey &&
    aiCfg.baseUrl &&
    aiCfg.baseUrl.startsWith('https://') &&
    Array.isArray(state.units) &&
    state.units.length > 0 &&
    timeKey === reminderTime &&
    !aiRanDates.has(dateKey)
  ) {
    const mode = aiCfg.scheduleMode || 'daily';
    const due = mode === 'daily' || (mode === 'every_3d' && dayOfMonth % 3 === 1) || (mode === 'weekly' && new Date().getUTCDay() === 1);
    if (!due) return;

    aiRanDates.add(dateKey);
    try {
      const compactUnits = state.units.map(u => `${u.name}(${u.category}/${u.species}):Hr${u.ageDays}/${u.targetDays},${u.metric},${u.visual1},${u.statusNote}`).join('; ');
      const endpoint = aiCfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.apiKey.trim() },
        body: JSON.stringify({
          model: aiCfg.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
          max_tokens: 3000,
          temperature: 0.3,
          messages: [
            { role: 'system', content: 'Asisten AgroSync AI Kapanewon Pengasih. ' + GROUNDED_AI_STANDARDS + ' ATURAN KANTOR & JAM KERJA: Jadwal piket HANYA Senin-Jumat jam kerja kantor (07:30-16:00 WIB), dimulai paling awal pukul 07:30 WIB dan paling akhir pukul 16:00 WIB (DILARANG sebelum 07:30 atau setelah 16:00 WIB). Libur Sabtu/Minggu/Tanggal Merah. Balas HANYA JSON: {"summary":"ringkasan evaluasi 2 kalimat","schedules":[{"time":"HH:MM","category":"ternak|maggot|tanaman","unitName":"nama","title":"aksi","freq":"Harian|Mingguan|Bulanan|Sekali"}]}' },
            { role: 'user', content: `Evaluasi harian ${wd.dayName} ${dateKey} (${wd.isHoliday ? 'HARI LIBUR KANTOR - jangan tambah jadwal baru, cukup evaluasi' : 'HARI KERJA KANTOR'}). Ekosistem Sirkular: sampah ${(state.ecoStats&&state.ecoStats.wasteKg)||0}kg, air kolam ${(state.ecoStats&&state.ecoStats.waterLiters)||0}L, kasgot ${(state.ecoStats&&state.ecoStats.kasgotKg)||0}kg. Unit: ${compactUnits}` }
          ]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const choiceMsg = data && data.choices && data.choices[0] && data.choices[0].message;
        let content = choiceMsg ? (choiceMsg.content || choiceMsg.reasoning_content || '') : '';
        content = String(content || '').trim();
        const match = content ? content.match(/\{[\s\S]*\}/) : null;
        if (match) {
          const parsed = JSON.parse(match[0]);
        if (!wd.isHoliday && Array.isArray(parsed.schedules)) {
          parsed.schedules.forEach(ns => {
            const dup = (state.schedules || []).some(ex => ex.unitName === ns.unitName && ex.title.toLowerCase() === String(ns.title || '').toLowerCase() && !ex.done);
            if (!dup && ns.title) {
              state.schedules.push({
                id: 's' + Date.now() + Math.floor(Math.random() * 999),
                time: clampToOfficeHours(ns.time, '07:30'),
                category: ['ternak', 'maggot', 'tanaman'].includes(ns.category) ? ns.category : 'tanaman',
                unitId: '', unitName: ns.unitName || 'Umum', title: ns.title, freq: ns.freq || 'Harian', done: false, aiGenerated: true
              });
            }
          });
          state.schedules.sort((a, b) => a.time.localeCompare(b.time));
        }
        if (!Array.isArray(state.aiJournal)) state.aiJournal = [];
        state.aiJournal.unshift({
          id: 'j' + Date.now(), dateStr: `${dateKey} ${timeKey}`, day: state.simDay || 1,
          source: 'AI Server Terjadwal', title: wd.isHoliday ? `Analisis Hari Libur (${wd.reason})` : 'Evaluasi Harian Otomatis',
          summary: parsed.summary || 'Evaluasi harian selesai dijalankan AI Server.',
          tokens: (data.usage && data.usage.total_tokens) || 0
        });
        saveState(state);

        if (!wd.isHoliday && state.telegram && state.telegram.enabled && state.telegram.token) {
          await broadcastTelegram(state.telegram.token.trim(), `🤖 *Ringkasan Pagi AgroSync AI (${wd.dayName}, ${dateKey})*\n${parsed.summary || 'Jadwal hari ini telah diperbarui otomatis.'}\n\nGunakan menu di bawah untuk melihat jadwal & laporan.`, { reply_markup: getMainInlineKeyboard() });
        }
        console.log('[AI Scheduler] Analisis terjadwal selesai & disinkronkan.');
        }
      }
    } catch (err) {
      console.error('[AI Scheduler] Gagal menjalankan AI terjadwal:', err.message);
    }
  }
}

// ==================== 2. TELEGRAM BOT 2-ARAH LENGKAP (5 MENU UTAMA) ====================
async function sendTelegramMainMenu(token, chatId, greeting) {
  const wd = getIndonesiaWorkdayInfo();
  const statusLine = wd.isHoliday
    ? `🏖️ *Status Kantor:* Libur (${wd.reason}) — Analisis AI tetap aktif`
    : `🏢 *Status Kantor:* Hari Kerja (${wd.dayName}, ${wd.dateKey})`;
  const text = `${greeting || '🌱 *Menu Utama AgroSync AI — Kapanewon Pengasih*'}\n${statusLine}\n\nPilih menu di bawah ini:`;
  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: getMainReplyKeyboard()
  });
  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text: '👇 *Akses Cepat Fitur AgroSync AI:*',
    parse_mode: 'Markdown',
    reply_markup: getMainInlineKeyboard()
  });
}

async function sendTelegramScheduleView(token, chatId) {
  syncRealtimeUnitAges(state);
  const wd = getIndonesiaWorkdayInfo();
  const all = (state && Array.isArray(state.schedules)) ? state.schedules.slice().sort((a, b) => a.time.localeCompare(b.time)) : [];
  const pending = all.filter(s => !s.done);
  const done = all.filter(s => s.done);

  let txt = `📅 *Jadwal Perawatan AgroSync AI*\n📆 ${wd.dayName}, ${wd.dateKey}\n`;
  if (wd.isHoliday) {
    txt += `🏖️ *Hari Libur Kantor (${wd.reason})*\n_Tidak ada jadwal piket harian hari ini. Jadwal aktif kembali: ${wd.nextWorkdayLabel}._\n\n`;
  } else {
    txt += `🏢 *Hari Kerja Kantor (Senin–Jumat)*\n\n`;
  }

  txt += `⏳ *Belum Dikerjakan (${pending.length}):*\n`;
  if (pending.length === 0) {
    txt += `_Semua jadwal sudah selesai!_\n`;
  } else {
    pending.forEach((s, i) => {
      txt += `${i + 1}. *${s.time} WIB* [${s.freq}] — ${s.title}\n   └ _${s.unitName}_\n`;
    });
  }

  txt += `\n✅ *Sudah Dikerjakan (${done.length}):*\n`;
  if (done.length === 0) {
    txt += `_Belum ada jadwal yang ditandai selesai hari ini._\n`;
  } else {
    done.forEach((s, i) => {
      txt += `${i + 1}. ~${s.time} WIB~ — ${s.title}\n   └ _Oleh: ${s.doneBy || 'Tim'}${s.doneAt ? ' (' + s.doneAt + ' WIB)' : ''}_\n`;
    });
  }

  const inlineRows = pending.slice(0, 6).map(s => ([
    { text: `✅ Selesai: ${s.time} ${s.title.slice(0, 28)}${s.title.length > 28 ? '…' : ''}`, callback_data: `done:${s.id}` }
  ]));
  inlineRows.push([{ text: '🔄 Refresh Jadwal', callback_data: 'menu:schedule' }, { text: '🏠 Menu Utama', callback_data: 'menu:home' }]);

  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text: txt,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineRows }
  });
}

async function sendTelegramHarvestAndEcoSummary(token, chatId) {
  syncRealtimeUnitAges(state);
  const units = (state && Array.isArray(state.units)) ? state.units : [];
  const harvests = (state && Array.isArray(state.harvestHistory)) ? state.harvestHistory : [];
  const eco = (state && state.ecoStats) || { wasteKg: 0, waterLiters: 0, kasgotKg: 0 };

  let txt = `📊 *Perkembangan Panen, Kurva & Dampak Lingkungan*\n_Perhitungan umur realtime WIB (${getWibNow().dateKey})_\n\n`;
  if (units.length === 0) {
    txt += `_Belum ada unit terdaftar._\n`;
  } else {
    units.forEach(u => {
      const pct = Math.min(100, Math.round(((u.ageDays || 1) / Math.max(1, u.targetDays || 30)) * 100));
      const filled = Math.round(pct / 20);
      const bar = '🟩'.repeat(filled) + '⬜'.repeat(5 - filled);
      const left = Math.max(0, (u.targetDays || 30) - (u.ageDays || 1));
      const mUnit = u.category === 'maggot' ? 'mm' : 'cm';
      const hist = Array.isArray(u.history) && u.history.length > 1 ? ` (kurva: ${u.history.slice(-4).join(' → ')} ${mUnit})` : '';
      txt += `• *${u.name}* (${u.species})\n  ${bar} *${pct}%* | Hr ${u.ageDays}/${u.targetDays} (${left === 0 ? 'Siap Panen!' : left + ' hr lagi'})\n  Ukuran: *${u.metric} ${mUnit}*${hist}\n  Status: _${u.statusNote || '-'}_\n\n`;
    });
  }

  txt += `🌍 *Dampak Lingkungan Sirkular:*\n`;
  txt += `• Sampah Organik Terolah: *${Number(eco.wasteKg || 0).toFixed(1)} kg*\n`;
  txt += `• Air Kolam Didaur Ulang: *${Math.round(Number(eco.waterLiters || 0))} Liter*\n`;
  txt += `• Pupuk Organik Kasgot: *${Number(eco.kasgotKg || 0).toFixed(1)} kg*\n`;
  txt += `• Riwayat Panen Internal: *${harvests.length} kali*\n`;
  if (harvests.length > 0) {
    txt += `_Terakhir: ${harvests[0].unitName} (${harvests[0].dateStr || '-'})_`;
  }

  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text: txt,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '📄 Unduh Laporan PDF', callback_data: 'menu:pdf' }, { text: '🏠 Menu Utama', callback_data: 'menu:home' }]] }
  });
}

async function sendTelegramPdfExport(token, chatId) {
  const stopTyping = startTyping(token, chatId, 'upload_document');
  syncRealtimeUnitAges(state);
  const { dateKey } = getWibNow();
  await tgApi(token, 'sendMessage', { chat_id: chatId, text: '📄 Sedang menyusun file Laporan PDF AgroSync AI terbaru...' });
  try {
    const pdfBuf = buildAgroSyncPdfBuffer(state);
    const filename = `Laporan_AgroSync_Kapanewon_Pengasih_${dateKey}.pdf`;
    const res = await tgSendDocument(token, chatId, pdfBuf, filename, `Laporan Lengkap AgroSync AI (${dateKey} WIB) — Unit Realtime, Jadwal, Panen & Dampak Lingkungan.`);
    if (!res || !res.ok) {
      await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Gagal mengirim PDF: ' + ((res && res.description) || 'Kesalahan Telegram API') });
    }
  } catch (err) {
    await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Gagal membuat PDF: ' + err.message });
  } finally {
    stopTyping();
  }
}

async function startTelegramPhotoFlow(token, chatId) {
  const units = (state && Array.isArray(state.units)) ? state.units : [];
  tgSessions.set(String(chatId), { mode: 'photo', unitId: '' });
  const rows = units.slice(0, 8).map(u => ([{ text: `📷 ${u.name} (Hr ${u.ageDays})`, callback_data: `photo_unit:${u.id}` }]));
  rows.push([{ text: '🤖 Auto-Deteksi Unit oleh AI (Langsung Kirim Foto)', callback_data: 'photo_unit:auto' }]);
  rows.push([{ text: '❌ Batal', callback_data: 'menu:cancel' }]);
  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text: '📸 *Analisis Foto Pertumbuhan & Gejala Penyakit*\n\nPilih unit yang akan difoto, atau langsung kirim foto sekarang (tanpa keterangan gejala pun AI tetap menganalisis gambar secara cermat & memperbarui data unit otomatis):',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: rows }
  });
}

async function startTelegramFormMenu(token, chatId) {
  tgSessions.delete(String(chatId));
  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text: '📝 *Isi Form Data AgroSync AI via Telegram*\nSemua data yang Anda input di sini otomatis masuk ke Web App secara real-time.\n\nPilih aksi:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Tambah Unit Baru (Tanaman / Ternak / Maggot)', callback_data: 'form:add_start' }],
        [{ text: '✏️ Edit / Update Ukuran & Kondisi Unit', callback_data: 'form:edit_list' }],
        [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'menu:home' }]
      ]
    }
  });
}

function isLikelyEnglish(str) {
  if (!str || typeof str !== 'string') return false;
  const englishPattern = /\b(the|is|are|was|were|in|on|at|with|no|not|healthy|symptoms|disease|maintain|moisture|adequate|ensure|immediate|treatment|needed|visible|leaves|substrate|larvae|infection|water|feed|damage|pest|yellowing|spotted|bacterial|fungal|rot|wilting|plant|plants|crop|crops|growth|stage|signs|recommended|action)\b/gi;
  const matches = str.match(englishPattern) || [];
  return matches.length >= 2;
}

async function translateToIndonesian(text, aiCfg) {
  if (!text || !isLikelyEnglish(text) || !aiCfg || !aiCfg.apiKey || !aiCfg.baseUrl) return text;
  try {
    const endpoint = aiCfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const tResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.apiKey.trim() },
      body: JSON.stringify({
        model: aiCfg.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
        max_tokens: 1500,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'Terjemahkan teks pertanian/budidaya ini ke dalam BAHASA INDONESIA yang lugas, baku, dan mudah dipahami. Balas HANYA teks terjemahan tanpa tanda kutip atau penjelasan tambahan.' },
          { role: 'user', content: text }
        ]
      })
    });
    if (tResp.ok) {
      const tData = await tResp.json();
      const choiceMsg = tData && tData.choices && tData.choices[0] && tData.choices[0].message;
      let trans = choiceMsg ? (choiceMsg.content || choiceMsg.reasoning_content || '') : '';
      trans = trans.replace(/^["'\s]+|["'\s]+$/g, '').trim();
      if (trans && !isLikelyEnglish(trans)) return trans;
    }
  } catch (_) {}
  return text;
}

// Handler Foto Telegram -> Analisis Vision AI Cermat (tanpa gejala manual pun tetap analisis + auto-update unit!)
async function handleTelegramPhotoMessage(token, msg, timeKey) {
  const chatId = msg.chat.id;
  const stopTyping = startTyping(token, chatId, 'typing');
  const sess = tgSessions.get(String(chatId)) || {};
  const photos = msg.photo || [];
  if (photos.length === 0) { stopTyping(); return; }
  const caption = (msg.caption || '').trim();
  const fallbackName = [msg.from && msg.from.first_name, msg.from && msg.from.last_name].filter(Boolean).join(' ');
  const senderName = findUserNameByChatId(state, chatId, fallbackName);

  // Pilih foto resolusi sedang (ideal untuk Vision AI / NVIDIA NIM: ~600-800px, tidak melebihi limit payload)
  const chosen = photos.length > 2 ? photos[photos.length - 2] : photos[photos.length - 1];
  const aiCfg = (state && state.aiConfig) || {};
  let targetUnit = (sess.unitId && sess.unitId !== 'auto')
    ? (state.units || []).find(u => u.id === sess.unitId)
    : null;

  await tgApi(token, 'sendMessage', {
    chat_id: chatId,
    text: `🔍 Foto diterima${targetUnit ? ` untuk *${targetUnit.name}*` : ''}! AI sedang menganalisis gambar secara cermat (pertumbuhan, kondisi visual & potensi penyakit)...`,
    parse_mode: 'Markdown'
  });

  try {
    const fileInfo = await tgApi(token, 'getFile', { file_id: chosen.file_id });
    if (!fileInfo || !fileInfo.ok || !fileInfo.result || !fileInfo.result.file_path) {
      await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Gagal mengunduh foto dari Telegram.' });
      return;
    }
    const fileUrl = `https://api.telegram.org/file/bot${encodeURIComponent(token)}/${fileInfo.result.file_path}`;
    const imgResp = await fetch(fileUrl);
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const dataUrl = 'data:image/jpeg;base64,' + buf.toString('base64');

    // If user is in Add Unit wizard step 'metrics_or_photo', let AI estimate and create unit!
    if (sess.mode === 'add_unit' && sess.step === 'metrics') {
      let estAge = 14, estMetric = 10, estNote = 'Sehat & Aktif';
      if (aiCfg.enabled && aiCfg.apiKey && aiCfg.baseUrl && aiCfg.baseUrl.startsWith('https://')) {
        try {
          const endpoint = aiCfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
          const aiResp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.apiKey.trim() },
            body: JSON.stringify({
              model: aiCfg.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
              max_tokens: 2500,
              temperature: 0.2,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Instruksi: Analisis foto unit budidaya baru. WAJIB 100% BAHASA INDONESIA. Balas HANYA JSON valid: {"ageDays":14,"metric":10,"statusNote":"kondisi singkat"}\nData: Unit ${sess.name} (${sess.category}/${sess.species}). Perkirakan umur hari, ukuran cm/mm, dan statusnya.` },
                    { type: 'image_url', image_url: { url: dataUrl } }
                  ]
                }
              ]
            })
          });
          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const choiceMsg = aiData && aiData.choices && aiData.choices[0] && aiData.choices[0].message;
            let content = choiceMsg ? (choiceMsg.content || choiceMsg.reasoning_content || '') : '';
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            const m = content ? content.match(/\{[\s\S]*\}/) : null;
            if (m) {
              const p = JSON.parse(m[0]);
              if (p.ageDays) estAge = Math.max(1, Math.round(Number(p.ageDays)));
              if (p.metric) estMetric = Math.max(0.1, Number(p.metric));
              if (p.statusNote) estNote = String(p.statusNote).slice(0, 60);
            }
          }
        } catch (eAdd) {
          console.error('[Add Unit AI Photo Error]:', eAdd.message);
        }
      }
      const newUnit = createUnitFromTelegram(sess, estAge, estMetric, estNote, dataUrl, senderName);
      tgSessions.delete(String(chatId));
      await tgApi(token, 'sendMessage', {
        chat_id: chatId,
        text: `✅ *Unit Baru Tersimpan dari Foto & Tersinkron ke Web!*\n• Nama: *${newUnit.name}*\n• Jenis: ${newUnit.species}\n• Estimasi AI: Umur *${newUnit.ageDays} hr*, Ukuran *${newUnit.metric} ${newUnit.category === 'maggot' ? 'mm' : 'cm'}*\n• Status: ${newUnit.statusNote}`,
        parse_mode: 'Markdown',
        reply_markup: getMainInlineKeyboard()
      });
      return;
    }

    let diagnosis = 'Foto tercatat ke galeri web. Aktifkan API Key AI (model Vision) di Konfigurasi Admin untuk analisis visual otomatis.';
    let treatment = 'Lakukan pemantauan rutin sesuai standar resmi KKP/IPB/BRMP.';
    let risk = 'ok';
    let taskTitle = '';
    let taskTime = '08:00';
    let engine = 'Telegram Foto';
    let tokens = 0;
    let detectedUnitName = targetUnit ? targetUnit.name : (caption || `Foto Telegram (${senderName})`);
    let aiUpdatedUnitInfo = '';

    if (aiCfg.enabled && aiCfg.apiKey && aiCfg.baseUrl && aiCfg.baseUrl.startsWith('https://')) {
      const w = state.weatherData && state.weatherData.current ? `Cuaca: ${state.weatherData.current.temp}C, ${state.weatherData.current.desc}.` : '';
      const unitsSummary = (state.units || []).map(u => `${u.id}:${u.name}(${u.species},Hr${u.ageDays},${u.metric})`).join('; ');
      const endpoint = aiCfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';

      const promptSystem = 'Kamu ahli agronomi & akuakultur AgroSync AI Kapanewon Pengasih. ' + GROUNDED_AI_STANDARDS + ' ATURAN BAHASA MUTLAK: Seluruh balasan teks (diagnosis, treatment, statusNote, taskTitle) WAJIB 100% menggunakan BAHASA INDONESIA baku, solutif, dan mudah dipahami petani/peternak. DILARANG KERAS MENGGUNAKAN BAHASA INGGRIS (NEVER WRITE ENGLISH). Analisis foto secara SANGAT CERMAT meskipun pengguna tidak menulis teks. Periksa apakah foto ini unit baru atau unit lama, jenis komoditas (sayuran/tanaman seperti cabai/tomat/terong/bayam, ternak lele/nila, atau maggot bsf), tahap pertumbuhan, estimasi ukuran, dan tanda gejala penyakit atau hama (bercak daun, kutu/thrips, daun keriting/menguning, jamur, busuk buah, dll). Balas HANYA JSON valid: {"risk":"ok|warn|danger","isNewUnit":false,"category":"ternak|maggot|tanaman","species":"nama komoditas spesifik","unitId":"id unit jika cocok","unitName":"nama unit","population":"estimasi populasi","ageDays":10,"estimatedMetric":7.5,"diagnosis":"analisis visual cermat 1-2 kalimat bahasa indonesia (sebutkan gejala penyakit atau hama jika ada)","treatment":"langkah penanganan praktis 1-2 kalimat bahasa indonesia (pupuk/pestisida nabati/perlakuan air/karantina)","statusNote":"status singkat 2-4 kata bahasa indonesia","taskTitle":"tugas jam kerja kantor 07:30-16:00 WIB jika perlu","taskTime":"07:30"}';
      const promptUser = `[PETUNJUK SISTEM]:\n${promptSystem}\n\n[DATA BUDIDAYA & KONDISI]:\nPengirim: ${senderName}. ${w} Ekosistem Sirkular: sampah ${(state.ecoStats&&state.ecoStats.wasteKg)||0}kg, air kolam ${(state.ecoStats&&state.ecoStats.waterLiters)||0}L, kasgot ${(state.ecoStats&&state.ecoStats.kasgotKg)||0}kg. Unit terpilih: ${targetUnit ? `${targetUnit.id}:${targetUnit.name} (${targetUnit.species}, Hr ${targetUnit.ageDays}, ukuran ${targetUnit.metric})` : 'Auto-deteksi'}. Daftar unit saat ini: ${unitsSummary || 'KOSONG (belum ada unit tersimpan)'}. Keterangan pengguna: ${caption || 'KOSONG - wajib analisis visual cermat dari foto saja'}\n\nINSTRUKSI PENTING: Wajib berikan seluruh hasil analisis dan diagnosis HANYA dalam BAHASA INDONESIA (Dilarang Bahasa Inggris).`;

      const aiResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.apiKey.trim() },
        body: JSON.stringify({
          model: aiCfg.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
          max_tokens: 3000,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptUser },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ]
        })
      });

      if (!aiResp.ok) {
        const errRaw = await aiResp.text();
        let errData = null;
        try { errData = JSON.parse(errRaw); } catch (_) {}
        const rawErrMsg = (errData && errData.error && (errData.error.message || errData.error))
          || (errData && errData.detail)
          || `HTTP ${aiResp.status}: ${errRaw.slice(0, 160)}`;
        console.error('[Telegram Photo AI Error]:', aiResp.status, rawErrMsg);

        let modelTip = '';
        if (/does not support|modality|not support vision|image_url|invalid_request/i.test(String(rawErrMsg))) {
          modelTip = '\n\n💡 *Penyebab:* Model NVIDIA yang Anda pilih bertipe teks-murni (seperti Nemotron-70B/340B teks). Untuk analisis gambar di NVIDIA NIM, gunakan model Vision seperti `meta/llama-3.2-11b-vision-instruct` atau `qwen/qwen2.5-vl-72b-instruct`.';
        } else if (/unauthorized|invalid api key|401/i.test(String(rawErrMsg))) {
          modelTip = '\n\n💡 *Penyebab:* API Key NVIDIA NIM tidak valid atau salah.';
        }
        diagnosis = `Gagal dianalisis oleh AI: ${String(rawErrMsg).slice(0, 140)}${modelTip}`;
        treatment = 'Periksa nama model & API Key di tab Konfigurasi Web App.';
        risk = 'warn';
      } else {
        const aiData = await aiResp.json();
        const choiceMsg = aiData && aiData.choices && aiData.choices[0] && aiData.choices[0].message;
        let content = choiceMsg ? (choiceMsg.content || choiceMsg.reasoning_content || '') : '';
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        let parsed = null;
        const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlock) {
          try { parsed = JSON.parse(codeBlock[1].trim()); } catch (_) {}
        }
        if (!parsed) {
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try { parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1).trim()); } catch (_) {}
          }
        }

        if (parsed) {
          diagnosis = parsed.diagnosis || diagnosis;
          treatment = parsed.treatment || treatment;
          risk = ['ok', 'warn', 'danger'].includes(parsed.risk) ? parsed.risk : 'warn';
          taskTitle = parsed.taskTitle || '';
          taskTime = clampToOfficeHours(parsed.taskTime, '07:30');
          engine = 'AI Vision (TG)';
          tokens = (aiData.usage && aiData.usage.total_tokens) || 0;

          let matchedUnit = targetUnit || (state.units || []).find(u => u.id === parsed.unitId || (parsed.unitName && u.name.toLowerCase().includes(String(parsed.unitName).toLowerCase())));
          if (matchedUnit) {
            detectedUnitName = matchedUnit.name;
            targetUnit = matchedUnit;
            if (parsed.statusNote && String(parsed.statusNote).trim()) {
              matchedUnit.statusNote = String(parsed.statusNote).trim().slice(0, 60);
              aiUpdatedUnitInfo = `Status -> "${matchedUnit.statusNote}"`;
            }
            if (parsed.estimatedMetric && !isNaN(Number(parsed.estimatedMetric)) && Number(parsed.estimatedMetric) > 0) {
              const est = Math.round(Number(parsed.estimatedMetric) * 10) / 10;
              matchedUnit.metric = est;
              if (!Array.isArray(matchedUnit.history)) matchedUnit.history = [];
              matchedUnit.history.push(est);
              if (matchedUnit.history.length > 12) matchedUnit.history.shift();
              const mU = matchedUnit.category === 'maggot' ? 'mm' : 'cm';
              aiUpdatedUnitInfo += (aiUpdatedUnitInfo ? ', ' : '') + `Ukuran -> ${est} ${mU}`;
            }
          } else {
            // Jika belum ada unit tersimpan atau terdeteksi foto unit baru:
            const shouldCreateNew = (!state.units || state.units.length === 0) || parsed.isNewUnit || /(tambah|baru|tebar|tanam|bibit|benih|kolam|biopond|bedeng|polybag)/i.test(caption);
            if (shouldCreateNew) {
              let cat = ['ternak', 'maggot', 'tanaman'].includes(parsed.category) ? parsed.category : 'tanaman';
              if (/(lele|nila|ikan|kolam)/i.test(caption) || /(lele|nila|ikan)/i.test(parsed.species || '')) cat = 'ternak';
              else if (/(maggot|bsf|larva|biopond)/i.test(caption) || /(maggot|bsf)/i.test(parsed.species || '')) cat = 'maggot';

              const sp = parsed.species || (cat === 'ternak' ? 'Ikan Lele' : cat === 'maggot' ? 'Maggot BSF' : 'Cabai Rawit');
              let uName = parsed.unitName || caption || (cat === 'ternak' ? 'Kolam Lele 1' : cat === 'maggot' ? 'Biopond Maggot 1' : 'Unit Tanaman 1');
              uName = uName.slice(0, 40);
              const pop = parsed.population || (cat === 'ternak' ? '200 ekor' : cat === 'maggot' ? '1 kg' : '10 polybag');
              const estAge = Math.max(1, Math.round(Number(parsed.ageDays) || 7));
              const estMetric = Math.max(0.1, Math.round((Number(parsed.estimatedMetric) || (cat === 'maggot' ? 8 : 7)) * 10) / 10);

              const newUnit = createUnitFromTelegram({
                category: cat,
                species: sp,
                name: uName,
                population: pop
              }, estAge, estMetric, parsed.statusNote || 'Sehat & Aktif', '', senderName);

              targetUnit = newUnit;
              detectedUnitName = newUnit.name;
              const mU = cat === 'maggot' ? 'mm' : 'cm';
              aiUpdatedUnitInfo = `✨ *Unit Baru Otomatis Dibuat:* ${newUnit.name} (${newUnit.species}, Hr ${estAge}, ${estMetric} ${mU}) + Jadwal kantor 07:30–16:00 WIB aktif`;
            }
          }
        } else if (content) {
          diagnosis = content.slice(0, 250);
          treatment = 'Lakukan observasi visual berkala.';
          engine = 'AI Vision (TG)';
        }

        // Pastikan hasil selalu dalam Bahasa Indonesia jika model sempat mengeluarkan Bahasa Inggris
        if (isLikelyEnglish(diagnosis)) {
          diagnosis = await translateToIndonesian(diagnosis, aiCfg);
        }
        if (isLikelyEnglish(treatment)) {
          treatment = await translateToIndonesian(treatment, aiCfg);
        }
      }
    }

    if (!Array.isArray(state.photoLogs)) state.photoLogs = [];
    state.photoLogs.unshift({
      id: 'ptg_' + Date.now(),
      unitId: targetUnit ? targetUnit.id : '',
      unitName: detectedUnitName,
      ageDays: targetUnit ? targetUnit.ageDays : (state.simDay || 1),
      metricStr: targetUnit ? `${targetUnit.metric} ${targetUnit.category === 'maggot' ? 'mm' : 'cm'}` : 'Via Telegram',
      engine,
      dateStr: `${getWibNow().dateKey} ${timeKey} WIB`,
      risk,
      summary: diagnosis,
      treatment: treatment,
      photoDataUrl: dataUrl
    });
    if (state.photoLogs.length > 9) state.photoLogs = state.photoLogs.slice(0, 9);

    if (taskTitle) {
      if (!Array.isArray(state.schedules)) state.schedules = [];
      state.schedules.push({
        id: 'stg_' + Date.now(),
        time: taskTime,
        category: targetUnit ? targetUnit.category : 'tanaman',
        unitId: targetUnit ? targetUnit.id : '',
        unitName: detectedUnitName,
        title: taskTitle,
        freq: 'Sekali',
        done: false,
        aiGenerated: true
      });
      state.schedules.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (!Array.isArray(state.aiJournal)) state.aiJournal = [];
    state.aiJournal.unshift({
      id: 'jtg_' + Date.now(),
      dateStr: `${getWibNow().dateKey} ${timeKey}`,
      day: state.simDay || 1,
      source: engine,
      title: `Analisis Foto Telegram — ${detectedUnitName}`,
      summary: `${diagnosis} Saran: ${treatment}`,
      tokens
    });
    addActivityLog('ai', engine, `Analisis Foto Telegram (${senderName})`, `${detectedUnitName}: ${diagnosis}`);
    tgSessions.delete(String(chatId));
    saveState(state);

    const icon = risk === 'danger' ? '🚨' : risk === 'warn' ? '⚠️' : '✅';
    const replyText = `${icon} *Hasil Analisis Foto AgroSync AI*\n*Unit:* ${detectedUnitName}\n*Pengirim:* ${senderName}\n*Diagnosis:* ${diagnosis}\n*Penanganan:* ${treatment}${aiUpdatedUnitInfo ? `\n*Pembaruan Unit:* ${aiUpdatedUnitInfo}` : ''}${taskTitle ? `\n*Jadwal Hari Kerja:* ${taskTime} WIB — ${taskTitle}` : ''}\n\n_Foto & data otomatis tersinkron ke Web App._`;
    await tgApi(token, 'sendMessage', { chat_id: chatId, text: replyText, parse_mode: 'Markdown', reply_markup: getMainInlineKeyboard() });
    // Broadcast juga ke semua ID Telegram penerima lain agar seluruh tim mendapat notifikasi
    const otherTargets = getTelegramTargets(state).filter(cid => String(cid) !== String(chatId));
    for (const cid of otherTargets) {
      try {
        await tgApi(token, 'sendMessage', { chat_id: cid, text: replyText, parse_mode: 'Markdown' });
      } catch (_) {}
    }
  } catch (err) {
    console.error('[Telegram Photo] Error:', err.message);
    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: `⚠️ *Gagal menganalisis foto:* ${err.message || 'Terjadi gangguan koneksi ke AI'}\n\nSilakan coba kirim ulang foto dengan pencahayaan jelas, atau sertakan keterangan gejala pada caption foto.`
    });
  } finally {
    stopTyping();
  }
}

function generateSchedulesForUnit(unit) {
  if (!unit || !unit.id) return [];
  if (!Array.isArray(state.schedules)) state.schedules = [];
  const cat = unit.category || 'tanaman';
  let defaultTasks = [];
  if (cat === 'ternak') {
    defaultTasks = [
      { time: '07:30', title: 'Pemberian Pakan Pagi & Cek Nafsu Makan', freq: 'Harian' },
      { time: '08:30', title: 'Pengecekan Kualitas Air Kolam (Warna, Bau & Suhu)', freq: 'Harian' },
      { time: '12:30', title: 'Pemberian Pakan Siang (Pelet / Maggot)', freq: 'Harian' },
      { time: '15:45', title: 'Pemberian Pakan Sore & Cek Sirkulasi Air', freq: 'Harian' }
    ];
  } else if (cat === 'maggot') {
    defaultTasks = [
      { time: '08:00', title: 'Pemberian Sampah Organik Cacah & Cek Kelembaban Biopond', freq: 'Harian' },
      { time: '13:00', title: 'Pengecekan Kelembaban & Suhu Biopond', freq: 'Harian' },
      { time: '15:30', title: 'Pengadukan Media & Monitoring Kasgot', freq: 'Harian' }
    ];
  } else {
    // tanaman
    defaultTasks = [
      { time: '07:30', title: 'Penyiraman Pagi (Air Kolam Daur Ulang) & Cek Hama Daun', freq: 'Harian' },
      { time: '09:30', title: 'Pengecekan Media Tanam & Aplikasi Kasgot', freq: '2 Hari Sekali' },
      { time: '15:30', title: 'Penyiraman Sore & Pengecekan Kelembaban Tanah', freq: 'Harian' }
    ];
  }

  const created = [];
  defaultTasks.forEach(dt => {
    const exists = state.schedules.some(s => s.unitName === unit.name && s.title === dt.title && !s.done);
    if (!exists) {
      const newSched = {
        id: 's' + Date.now() + Math.floor(Math.random() * 9999),
        time: clampToOfficeHours(dt.time, '07:30'),
        category: cat,
        unitId: unit.id,
        unitName: unit.name,
        title: dt.title,
        freq: dt.freq,
        done: false,
        aiGenerated: true
      };
      state.schedules.push(newSched);
      created.push(newSched);
    }
  });
  state.schedules.sort((a, b) => a.time.localeCompare(b.time));
  return created;
}

function createUnitFromTelegram(sess, ageDays, metric, statusNote, photoDataUrl, senderName) {
  if (!Array.isArray(state.units)) state.units = [];
  const cat = sess.category || 'tanaman';
  const typesList = (state.types && state.types[cat]) || [];
  const typeObj = typesList.find(t => t.name === sess.species) || {};
  const targetDays = typeObj.harvestDays || (cat === 'ternak' ? 60 : cat === 'maggot' ? 18 : 60);
  const targetSize = typeObj.targetSize || (cat === 'ternak' ? 24 : cat === 'maggot' ? 22 : 50);
  const safeAge = Math.max(1, Math.round(Number(ageDays) || 1));
  const safeMetric = Math.max(0.1, Math.round((Number(metric) || (cat === 'maggot' ? 8 : 7)) * 10) / 10);
  const newUnit = {
    id: 'u' + Date.now() + Math.floor(Math.random() * 1000),
    category: cat,
    species: sess.species || (cat === 'ternak' ? 'Ikan Lele' : cat === 'maggot' ? 'Maggot BSF' : 'Cabai Rawit'),
    name: sess.name || 'Unit Baru Telegram',
    population: sess.population || (cat === 'ternak' ? '200 ekor' : cat === 'maggot' ? '1 kg' : '10 polybag'),
    startDate: getWibNow(-(safeAge - 1)).dateKey,
    ageDays: safeAge,
    targetDays,
    targetSize,
    metric: safeMetric,
    visual1: cat === 'ternak' ? 'Hijau Kecokelatan (Ideal)' : cat === 'maggot' ? 'Gembur & Lembab Pas' : 'Hijau Segar & Tegak',
    visual2: cat === 'ternak' ? 'Tidak Bau, Makan Lahap' : cat === 'maggot' ? 'Aktif Makan, Tidak Bau' : 'Lembab Pas',
    statusNote: statusNote || 'Sehat & Aktif',
    history: [safeMetric],
    checklistDone: [false, false, false]
  };
  state.units.push(newUnit);
  generateSchedulesForUnit(newUnit);
  if (photoDataUrl) {
    if (!Array.isArray(state.photoLogs)) state.photoLogs = [];
    state.photoLogs.unshift({
      id: 'p' + Date.now(), unitId: newUnit.id, unitName: newUnit.name, ageDays: safeAge,
      metricStr: `${safeMetric} ${cat === 'maggot' ? 'mm' : 'cm'}`, engine: 'Foto Awal (TG)',
      dateStr: `${getWibNow().dateKey} ${getWibNow().timeKey} WIB`, risk: 'ok',
      summary: `Input unit baru via Telegram oleh ${senderName}`, photoDataUrl
    });
  }
  addActivityLog('human', senderName, 'Input Unit via Telegram', `${newUnit.name} (${newUnit.species}, Hr ${safeAge}, ${safeMetric})`);
  saveState(state);
  return newUnit;
}

function generateLocalTelegramAnswer(question, st) {
  const q = String(question || '').toLowerCase();
  const units = (st && Array.isArray(st.units)) ? st.units : [];
  const scheds = (st && Array.isArray(st.schedules)) ? st.schedules : [];
  const eco = (st && st.ecoStats) || { wasteKg: 0, waterLiters: 0, kasgotKg: 0 };
  const harvests = (st && Array.isArray(st.harvestHistory)) ? st.harvestHistory : [];

  if (units.length === 0) {
    return 'Belum ada data unit budidaya tersimpan di AgroSync AI.\n\n' +
      '💡 *Cara Mengisi / Update Data via Telegram:*\n' +
      '1️⃣ *Ketik langsung pesan natural*, contoh:\n' +
      '   • `Tambah Kolam Lele 1 tebar 300 ekor ukuran 7 cm umur 5 hari`\n' +
      '   • `Tanam 20 polybag cabai rawit ukuran 15 cm umur 20 hari`\n' +
      '   • `Tebar Maggot BSF 2 kg umur 4 hari ukuran 8 mm`\n' +
      '   • `Sampah organik 2.5 kg ke maggot`\n' +
      '   • `Siram tanaman pakai air kolam 30 liter`\n' +
      '   • `Panen kasgot 2 kg`\n' +
      '2️⃣ *Kirim Foto Langsung* (AI Vision mendeteksi otomatis & menyimpannya)\n' +
      '3️⃣ *Tekan tombol "📝 Isi Form / Input Unit"* di bawah.\n\n' +
      '_Jadwal hari kerja kantor (07:30–16:00 WIB) otomatis dibuatkan untuk setiap unit baru!_';
  }

  if (/(jadwal|tugas|piket|selesai|belum)/.test(q)) {
    const pending = scheds.filter(s => !s.done);
    const done = scheds.filter(s => s.done);
    return `📅 *Status Jadwal Hari Ini:*\n• Belum dikerjakan: *${pending.length}* tugas\n• Sudah selesai: *${done.length}* tugas\n` +
      (pending.length > 0 ? '\n⏳ *Berikutnya:*\n' + pending.slice(0, 4).map(s => `• ${s.time} WIB — ${s.title} (${s.unitName})`).join('\n') : '\n✅ Semua jadwal hari ini sudah selesai!');
  }
  if (/(sampah|kasgot|lingkungan|air kolam|eco|dampak)/.test(q)) {
    return `🌍 *Dampak Lingkungan Sirkular Kapanewon Pengasih:*\n• Sampah organik terolah Maggot BSF: *${Number(eco.wasteKg || 0).toFixed(1)} kg*\n• Air kolam lele didaur ulang untuk kebun: *${Math.round(Number(eco.waterLiters || 0))} Liter*\n• Pupuk organik kasgot: *${Number(eco.kasgotKg || 0).toFixed(1)} kg*\n• Total panen internal: *${harvests.length}x*`;
  }
  if (/(penyakit|hama|sakit|bintik|kuning|bau|mati|keriting|jamur)/.test(q)) {
    return '🩺 *Panduan Cepat Penanganan Tanpa Alat (KKP/IPB/BRMP):*\n• *Lele bintik putih/jamur:* karantina ikan + garam krosok 2–3x/hr.\n• *Lele menggantung/air bau:* puasa 6–12 jam + ganti air 15% (air endapan 24 jam) + probiotik.\n• *Tanaman kuning/hama daun:* pangkas daun terinfeksi + semprot pestisida nabati sore hari.\n\n_Kirimkan **foto** langsung di chat ini agar AI menganalisis gejalanya secara cermat!_';
  }
  // Check if user asks about a specific unit/species (lele, maggot, terong, cabai, bayam, tomat, kolam)
  const matched = units.filter(u => q.includes(u.name.toLowerCase()) || q.includes(u.species.toLowerCase().split(' ')[0]) || (q.includes('lele') && u.category === 'ternak') || (q.includes('kolam') && u.category === 'ternak') || (q.includes('maggot') && u.category === 'maggot') || (q.includes('sayur') && u.category === 'tanaman'));
  if (matched.length > 0 || /(panen|umur|ukuran|tumbuh|kembang|berapa|kapan|kondisi|status)/.test(q)) {
    const list = matched.length > 0 ? matched : units;
    return '🌱 *Data Tumbuh Kembang Realtime:*\n' + list.map(u => {
      const pct = Math.min(100, Math.round(((u.ageDays || 1) / Math.max(1, u.targetDays || 30)) * 100));
      const left = Math.max(0, (u.targetDays || 30) - (u.ageDays || 1));
      const mU = u.category === 'maggot' ? 'mm' : 'cm';
      return `• *${u.name}* (${u.species}): Umur *Hr ${u.ageDays}/${u.targetDays}* (${pct}%, ${left === 0 ? 'Siap Panen!' : left + ' hr lagi'}), Ukuran *${u.metric} ${mU}*, Status: _${u.statusNote}_`;
    }).join('\n');
  }
  return '🤖 *Ringkasan AgroSync AI:*\nSaat ini terpantau *' + units.length + ' unit aktif* (umur realtime WIB) dan *' + scheds.filter(s => !s.done).length + ' jadwal belum selesai*.\n\nTanyakan langsung soal panen, umur/ukuran lele, maggot, sayuran, jadwal, atau kirim foto untuk analisis visual!';
}

function tryLocalNaturalDataEntry(text, senderName) {
  if (!state) return null;
  const raw = String(text || '').trim();
  const q = raw.toLowerCase();
  // Jika pesan berupa multi-baris, teks panjang (>120 karakter), atau instruksi multi-data kompleks:
  // Serahkan sepenuhnya ke AI extraction (Lapis 2) agar seluruh data diekstrak secara utuh!
  if (raw.includes('\n') || raw.length > 120 || /(?:berikut|sebagai berikut|kategori|daftar|ganti|menggantikan)/i.test(q)) {
    return null;
  }
  // Abaikan jika kalimat jelas merupakan pertanyaan murni
  if (/^(apakah|bagaimana|gimana|kenapa|mengapa|kapan|berapa|siapa|dimana|di mana|mana|tolong jelaskan|jelaskan|apa\s)/.test(q) || (q.includes('?') && !/(tambah|input|tebar|tanam|ukuran|sampah|air kolam|kasgot)/i.test(q))) {
    return null;
  }

  if (!state.ecoStats) state.ecoStats = { wasteKg: 0, waterLiters: 0, kasgotKg: 0 };
  const prevEcoSnapshot = { wasteKg: Number(state.ecoStats.wasteKg || 0), waterLiters: Number(state.ecoStats.waterLiters || 0), kasgotKg: Number(state.ecoStats.kasgotKg || 0) };
  const changes = [];
  const parseNum = s => parseFloat(String(s || '0').replace(',', '.'));

  // 0. Deteksi Tambah / Input Unit Baru Cepat via Pesan Natural
  // Contoh:
  // "Tambah Kolam Lele 1 tebar 300 ekor ukuran 7 cm umur 5 hari"
  // "Tanam 20 polybag cabai rawit ukuran 15 cm umur 20 hari"
  // "Tebar maggot bsf 2 kg umur 4 hari ukuran 8 mm"
  // "Input kolam lele 2 200 ekor bibit 8 cm 10 hari"
  const isAddUnitCmd = /(?:tambah|input|buat|masukkan|tebar|tanam|semai)\b/i.test(q) &&
                       /(?:lele|nila|ikan|kolam|maggot|bsf|biopond|cabai|cabe|tomat|terong|kangkung|bayam|pakcoy|sawi|tanaman|polybag|polibag|bedeng)\b/i.test(q);
  if (isAddUnitCmd) {
    let cat = 'tanaman';
    let species = 'Cabai Rawit';
    if (/(lele|nila|ikan|kolam|gurame|patin)/i.test(q)) {
      cat = 'ternak';
      species = /(nila)/i.test(q) ? 'Ikan Nila' : 'Ikan Lele';
    } else if (/(maggot|bsf|larva|biopond|kasgot)/i.test(q)) {
      cat = 'maggot';
      species = 'Maggot BSF';
    } else {
      cat = 'tanaman';
      if (/(cabai|cabe)/i.test(q)) species = 'Cabai Rawit';
      else if (/(terong)/i.test(q)) species = 'Terong Ungu';
      else if (/(tomat)/i.test(q)) species = 'Tomat Rampai';
      else if (/(kangkung)/i.test(q)) species = 'Kangkung Budikdamber';
      else if (/(pakcoy|sawi)/i.test(q)) species = 'Pakcoy / Sawi';
      else if (/(bayam)/i.test(q)) species = 'Bayam Hijau';
    }

    // Nama unit
    let unitName = '';
    const nameMatch = raw.match(/(?:tambah|input|buat|masukkan|tebar|tanam|semai)\s+(?:unit\s+)?([A-Za-z0-9\s_-]+?)(?=\s+(?:tebar|tanam|sebanyak|populasi|ukuran|umur|usia|\d+\s*(?:ekor|polybag|polibag|kg|bibit|benih|cm|mm|hari))|$)/i);
    if (nameMatch && nameMatch[1] && nameMatch[1].trim().length >= 3 && nameMatch[1].trim().length <= 40) {
      unitName = nameMatch[1].trim();
    } else {
      const countExisting = ((state.units || []).filter(u => u.category === cat).length) + 1;
      unitName = cat === 'ternak' ? `Kolam ${species} ${countExisting}` : cat === 'maggot' ? `Biopond Maggot ${countExisting}` : `Bedeng ${species} ${countExisting}`;
    }

    // Populasi
    let pop = '';
    const popMatch = q.match(/(\d+)\s*(ekor|bibit|benih|polybag|polibag|pot|batang|kg|box|wadah)/i);
    if (popMatch) {
      pop = `${popMatch[1]} ${popMatch[2]}`;
    } else {
      pop = cat === 'ternak' ? '200 ekor' : cat === 'maggot' ? '1 kg' : '15 polybag';
    }

    // Umur (hari)
    let ageDays = 1;
    const ageMatch = q.match(/(?:umur|usia|hr|hari)\s*(\d+)/i) || q.match(/(\d+)\s*(?:hari|hr)\b/i);
    if (ageMatch) {
      ageDays = Math.max(1, parseInt(ageMatch[1], 10));
    }

    // Ukuran (cm / mm)
    let metric = cat === 'maggot' ? 8 : 7;
    const mMatch = q.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centi|centimeter|mm|mili|milimeter)\b/i);
    if (mMatch) {
      metric = parseNum(mMatch[1]);
    }

    const mU = cat === 'maggot' ? 'mm' : 'cm';
    const existing = (state.units || []).find(u => {
      if (u.category !== cat) return false;
      const uName = (u.name || '').toLowerCase().trim();
      const nName = unitName.toLowerCase().trim();
      if (uName === nName || uName.includes(nName) || nName.includes(uName)) return true;
      const uHasNum = /\d+/.test(uName);
      const nHasNum = /\d+/.test(nName);
      return !uHasNum && !nHasNum && u.species.toLowerCase() === species.toLowerCase();
    });

    if (existing) {
      const isIdentical = Math.abs(Number(existing.metric) - Number(metric)) < 0.1 &&
                          Number(existing.ageDays) === Number(ageDays);
      if (isIdentical) {
        return `⚠️ *Verifikasi Ulang: Data Sudah Pernah Tercatat Sebelumnya!*\n\nUnit *${existing.name}* (${existing.species}, ${existing.population}, Hr ${existing.ageDays}, ${existing.metric} ${mU}) sudah tercatat aktif di AgroSync AI.\n\n🛡️ *Perlindungan Duplikasi:* Data tidak digandakan. Unit tetap aktif dan terjadwal di Web App.`;
      } else {
        existing.metric = metric;
        existing.ageDays = ageDays;
        existing.startDate = getWibNow(-(ageDays - 1)).dateKey;
        if (pop) existing.population = pop;
        if (!Array.isArray(existing.history)) existing.history = [];
        existing.history.push(metric);
        if (existing.history.length > 12) existing.history.shift();
        addActivityLog('human', senderName, 'Update Unit via Telegram', `${existing.name}: Hr ${ageDays}, ${metric} ${mU}`);
        saveState(state);
        return `🔄 *Pembaruan Data Unit Berhasil!*\n\n• Unit: *${existing.name}*\n• Umur Kini: *Hr ${existing.ageDays}*\n• Ukuran Kini: *${existing.metric} ${mU}*\n\n_Data otomatis tersinkron ke Web App._`;
      }
    }

    const newUnit = createUnitFromTelegram({
      category: cat,
      species,
      name: unitName,
      population: pop
    }, ageDays, metric, 'Sehat & Aktif (Input Cepat TG)', '', senderName);

    changes.push(`✨ *Unit Baru Berhasil Disimpan:*\n• Nama: *${newUnit.name}*\n• Komoditas: *${newUnit.species}* (${cat})\n• Populasi: *${newUnit.population}*\n• Umur Realtime: *Hr ${newUnit.ageDays}* | Ukuran: *${newUnit.metric} ${mU}*\n• Jadwal Hari Kerja Kantor (07:30–16:00 WIB) otomatis aktif!`);
  }

  // 1. Deteksi Sampah Organik -> Maggot (misal: "menaruh sampah ke magot 1,5 kg", "sampah 2 kg", "kasih makan maggot 1.5kg")
  const wasteMatch = q.match(/(?:sampah|limbah|sisa dapur|organik|mag+ot)[^\d]{0,35}(\d+(?:[.,]\d+)?)\s*(kg|kilogram|gram|gr|g)\b/) ||
                     q.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|gram|gr|g)\s*(?:sampah|limbah|ke mag+ot|untuk mag+ot|organik)/);
  if (wasteMatch && /(sampah|limbah|sisa dapur|organik|mag+ot)/.test(q) && !/kasgot/.test(q.slice(0, wasteMatch.index + 25))) {
    let val = parseNum(wasteMatch[1]);
    if (/(gram|gr|^g$)/.test(wasteMatch[2])) val = val / 1000;
    if (val > 0 && val < 500) {
      state.ecoStats.wasteKg = Math.round(((state.ecoStats.wasteKg || 0) + val) * 10) / 10;
      changes.push(`♻️ Sampah ke Maggot: *+${Math.round(val * 100) / 100} kg* (Total kini: *${state.ecoStats.wasteKg} kg*)`);
    }
  }

  // 2. Deteksi Air Kolam -> Siram Tanaman (misal: "siram pakai air kolam 20 liter", "air kolam 15 L")
  const waterMatch = q.match(/(?:air kolam|air lele|siram)[^\d]{0,35}(\d+(?:[.,]\d+)?)\s*(liter|ltr|l|ember)\b/) ||
                     q.match(/(\d+(?:[.,]\d+)?)\s*(liter|ltr|l|ember)\s*(?:air kolam|air lele|siram)/);
  if (waterMatch && /(air kolam|air lele|siram)/.test(q)) {
    let val = parseNum(waterMatch[1]);
    if (waterMatch[2] === 'ember') val = val * 10;
    if (val > 0 && val < 10000) {
      state.ecoStats.waterLiters = Math.round((state.ecoStats.waterLiters || 0) + val);
      changes.push(`💧 Air Kolam Didaur Ulang: *+${Math.round(val)} L* (Total kini: *${state.ecoStats.waterLiters} L*)`);
    }
  }

  // 3. Deteksi Pupuk Kasgot (misal: "panen kasgot 1,5 kg", "pupuk kasgot 2 kg")
  const kasgotMatch = q.match(/(?:kasgot|pupuk organik|kompos mag+ot)[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(kg|kilogram|gram|gr|g)\b/) ||
                      q.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|gram|gr|g)\s*(?:kasgot|pupuk)/);
  if (kasgotMatch && /(kasgot|kompos mag+ot)/.test(q)) {
    let val = parseNum(kasgotMatch[1]);
    if (/(gram|gr|^g$)/.test(kasgotMatch[2])) val = val / 1000;
    if (val > 0 && val < 500) {
      state.ecoStats.kasgotKg = Math.round(((state.ecoStats.kasgotKg || 0) + val) * 10) / 10;
      changes.push(`🌱 Pupuk Kasgot: *+${Math.round(val * 100) / 100} kg* (Total kini: *${state.ecoStats.kasgotKg} kg*)`);
    }
  }

  // 4. Deteksi Update Ukuran Unit (misal: "kolam lele 1 sekarang 18 cm", "terong ungu 82 cm", "update kolam 1 10 cm")
  const sizeMatch = q.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/);
  if (sizeMatch && Array.isArray(state.units) && state.units.length > 0 && !isAddUnitCmd) {
    const numVal = parseNum(sizeMatch[1]);
    const matchedUnit = state.units.find(u => {
      const nm = u.name.toLowerCase();
      const sp = u.species.toLowerCase().split(' ')[0];
      if (q.includes(nm)) return true;
      const numInName = nm.match(/\d+/);
      if (numInName && q.includes(numInName[0]) && (q.includes('kolam') || q.includes('bis') || q.includes('lele')) && u.category === 'ternak') return true;
      if (sp.length >= 4 && q.includes(sp) && u.category !== 'ternak') return true;
      return false;
    });
    if (matchedUnit && numVal > 0 && numVal < 500) {
      matchedUnit.metric = Math.round(numVal * 10) / 10;
      if (!Array.isArray(matchedUnit.history)) matchedUnit.history = [];
      matchedUnit.history.push(matchedUnit.metric);
      if (matchedUnit.history.length > 12) matchedUnit.history.shift();
      if (/(sehat|lincah|bagus|kurang|sakit|makan lahap)/i.test(q)) {
        const noteMatch = raw.match(/(?:sehat|lincah|bagus|kurang|sakit|makan lahap)[^,\n.]*/i);
        if (noteMatch) matchedUnit.statusNote = noteMatch[0].trim().slice(0, 60);
      }
      const mU = matchedUnit.category === 'maggot' ? 'mm' : 'cm';
      changes.push(`📏 Update *${matchedUnit.name}*: ukuran diperbarui menjadi *${matchedUnit.metric} ${mU}* (Status: ${matchedUnit.statusNote})`);
    }
  }

  if (changes.length > 0) {
    if (state.ecoStats.wasteKg !== prevEcoSnapshot.wasteKg || state.ecoStats.waterLiters !== prevEcoSnapshot.waterLiters || state.ecoStats.kasgotKg !== prevEcoSnapshot.kasgotKg) {
      if (!Array.isArray(state.ecoStatsHistory)) state.ecoStatsHistory = [];
      state.ecoStatsHistory.push(prevEcoSnapshot);
      if (state.ecoStatsHistory.length > 20) state.ecoStatsHistory.shift();
    }
    addActivityLog('human', senderName, 'Input Data Cepat via Telegram', raw.slice(0, 90));
    saveState(state);
    return `✅ *Data Berhasil Disimpan & Tersinkron ke Web App!*\n\n${changes.join('\n')}\n\n_Pelapor: ${senderName} • Data otomatis masuk ke analisis AI & grafik Beranda._`;
  }
  return null;
}

function extractUnitsFromTextRuleBased(text, senderName) {
  const rawText = String(text || '').trim();
  const rawLines = rawText.split(/[\r\n]+/);
  const segments = [];

  for (const rawL of rawLines) {
    const lTrim = rawL.trim();
    if (!lTrim) continue;

    const lLower = lTrim.toLowerCase();
    // Header intro skipping
    const isIntro = /^(berikut|daftar|ini\s*data|kategori|laporan|data\s*riil|data\s*real|rangkuman)\b/i.test(lLower) &&
      ((lLower.includes('maggot') && lLower.includes('sayur')) || lLower.includes('disurvei') || lTrim.endsWith(':') || lTrim.length > 70);
    if (isIntro) continue;

    // Split line by numbered bullets (1. ... 2. ...) or bullet markers
    const parts = lTrim.split(/(?=(?:^|\s)(?:\d+[\.\)]|[•\-\*])\s+)/g);
    for (const part of parts) {
      const p = part.trim();
      if (!p) continue;

      // Further split comma/semicolon-separated commodity items
      const subParts = p.split(/[,;]\s*(?=(?:cabai|cabe|terong|tomat|kangkung|pakcoy|sawi|bayam|pohon|biopond|maggot|kolam|ikan|lele|nila)\b)/i);
      for (const sp of subParts) {
        const spTrim = sp.trim();
        if (spTrim) segments.push(spTrim);
      }
    }
  }

  const units = [];
  const parseNum = s => parseFloat(String(s || '0').replace(',', '.'));
  let wasteKg = 0, waterLiters = 0, kasgotKg = 0;

  for (const line of segments) {
    const l = line.toLowerCase();

    // Eco stats
    const wMatch = l.match(/(?:sampah|limbah)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*(kg|gram|gr|g)/);
    if (wMatch) {
      let v = parseNum(wMatch[1]);
      if (/(gram|gr|g)/.test(wMatch[2])) v /= 1000;
      wasteKg += v;
    }
    const lMatch = l.match(/(?:air kolam|siram)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*(liter|ltr|l|ember)/);
    if (lMatch) {
      let v = parseNum(lMatch[1]);
      if (lMatch[2] === 'ember') v *= 10;
      waterLiters += v;
    }
    const kMatch = l.match(/(?:kasgot|pupuk)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*(kg|gram|gr|g)/);
    if (kMatch) {
      let v = parseNum(kMatch[1]);
      if (/(gram|gr|g)/.test(kMatch[2])) v /= 1000;
      kasgotKg += v;
    }

    // 1. Pohon Buah Pekarangan
    if (l.includes('pohon') || l.includes('pekarangan') || /(mangga|jambu|alpukat|kelengkeng|jeruk|belimbing|nangka|pepaya|pisang|durian)/i.test(l)) {
      const treeTypes = ['Mangga', 'Jambu', 'Alpukat', 'Kelengkeng', 'Jeruk', 'Belimbing', 'Nangka', 'Pepaya', 'Pisang', 'Durian'];
      const foundTrees = treeTypes.filter(t => l.includes(t.toLowerCase()));
      if (foundTrees.length > 0) {
        foundTrees.forEach(ft => {
          const ageM = l.match(/(?:umur|usia|hr|hari)\s*(\d+)/) || l.match(/(\d+)\s*(?:hari|hr)/);
          const metricM = l.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centi|m\b|meter)/);
          let treeMetric = 120.0;
          if (metricM) {
            treeMetric = parseNum(metricM[1]);
            if (/\b(?:m|meter)\b/.test(metricM[0])) treeMetric *= 100;
          }
          const popM = l.match(/(\d+)\s*(?:pohon|batang|bibit)/);
          units.push({
            category: 'tanaman',
            species: `Pohon ${ft}`,
            name: `Pohon ${ft} Pekarangan`,
            population: popM ? popM[0] : '1 pohon',
            ageDays: ageM ? parseInt(ageM[1], 10) : 90,
            metric: treeMetric,
            statusNote: 'Tumbuh Subur di Pekarangan'
          });
        });
        continue;
      }
    }

    // 2. Maggot BSF
    if (l.includes('maggot') || l.includes('bsf') || l.includes('biopond')) {
      const ageM = l.match(/(?:umur|usia|hr|hari)\s*(\d+)/) || l.match(/(\d+)\s*(?:hari|hr)/);
      const metricM = l.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|mili)/) || l.match(/(\d+(?:[.,]\d+)?)\s*(?:cm)/);
      const popM = l.match(/(\d+)\s*(?:biopond|box|kg|wadah)/) || l.match(/(?:biopond\s*(\d+))/);
      const numMatch = l.match(/biopond\s*(\d+)/i);
      units.push({
        category: 'maggot',
        species: 'Maggot BSF',
        name: numMatch ? `Biopond Maggot BSF ${numMatch[1]}` : 'Biopond Maggot BSF 1',
        population: popM ? (popM[0].includes('biopond') ? `${popM[1]} biopond` : popM[0]) : '1 biopond',
        ageDays: ageM ? parseInt(ageM[1], 10) : 10,
        metric: metricM ? parseNum(metricM[1]) : 15.0,
        statusNote: 'Aktif Mengurai Sampah'
      });
      continue;
    }

    // 3. Ikan / Kolam Ternak
    if (l.includes('lele') || l.includes('nila') || l.includes('ikan') || (l.includes('kolam') && !l.includes('air kolam'))) {
      const ageM = l.match(/(?:umur|usia|hr|hari)\s*(\d+)/) || l.match(/(\d+)\s*(?:hari|hr)/);
      const metricM = l.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centi)/);
      const popM = l.match(/(\d+)\s*(?:ekor|bibit|benih)/);
      const species = l.includes('nila') ? 'Ikan Nila' : 'Ikan Lele';
      const numMatch = l.match(/kolam\s*(\d+)/i);
      units.push({
        category: 'ternak',
        species,
        name: numMatch ? `Kolam ${species} ${numMatch[1]}` : `Kolam ${species} 1`,
        population: popM ? popM[0] : '250 bibit',
        ageDays: ageM ? parseInt(ageM[1], 10) : 14,
        metric: metricM ? parseNum(metricM[1]) : 8.0,
        statusNote: 'Sehat & Makan Lahap'
      });
      continue;
    }

    // 4. Sayuran
    const vegList = [
      { name: 'Cabai Rawit', kw: ['cabai', 'cabe', 'chili'], defAge: 20, defMetric: 18.0, defPop: '15 polybag' },
      { name: 'Terong Ungu', kw: ['terong', 'eggplant'], defAge: 25, defMetric: 22.0, defPop: '10 polybag' },
      { name: 'Tomat Rampai', kw: ['tomat', 'tomato'], defAge: 25, defMetric: 20.0, defPop: '10 polybag' },
      { name: 'Kangkung Budikdamber', kw: ['kangkung'], defAge: 14, defMetric: 15.0, defPop: '15 ember' },
      { name: 'Pakcoy / Sawi', kw: ['pakcoy', 'pokcoy', 'sawi', 'caisim'], defAge: 15, defMetric: 12.0, defPop: '15 polybag' },
      { name: 'Bayam Hijau', kw: ['bayam', 'spinach'], defAge: 12, defMetric: 10.0, defPop: '15 polybag' }
    ];
    for (const v of vegList) {
      if (v.kw.some(k => l.includes(k))) {
        const ageM = l.match(/(?:umur|usia|hr|hari)\s*(\d+)/) || l.match(/(\d+)\s*(?:hari|hr)/);
        const metricM = l.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centi)/);
        const popM = l.match(/(\d+)\s*(?:polybag|polibag|pot|ember|batang|bedeng|bibit|pohon)/);
        units.push({
          category: 'tanaman',
          species: v.name,
          name: l.includes('bedeng') ? `Bedeng ${v.name}` : v.name,
          population: popM ? popM[0] : v.defPop,
          ageDays: ageM ? parseInt(ageM[1], 10) : v.defAge,
          metric: metricM ? parseNum(metricM[1]) : v.defMetric,
          statusNote: 'Tumbuh Segar'
        });
        break;
      }
    }
  }
  return { units, wasteKg, waterLiters, kasgotKg };
}

function processExtractedUnits(parsed, rawQuestion, senderName) {
  if (!state) return { answer: '', count: 0 };
  const notes = [];
  const newCreated = [];
  const updated = [];
  const reverified = [];

  // Reset unit lama jika diminta
  if (parsed.replaceExistingUnits === true && Array.isArray(parsed.newUnits) && parsed.newUnits.length > 0) {
    state.units = [];
    state.schedules = (state.schedules || []).filter(s => !s.aiGenerated);
    notes.push('🗑️ *Data Lama Dikosongkan* (Diganti dengan data baru sesuai instruksi)');
  }

  const incomingUnits = Array.isArray(parsed.newUnits) ? parsed.newUnits : [];
  incomingUnits.forEach(nu => {
    if (!nu || !nu.name) return;
    const cat = ['ternak', 'maggot', 'tanaman'].includes(nu.category) ? nu.category : 'tanaman';
    const uAge = Math.max(1, Math.round(Number(nu.ageDays) || 1));
    const uMetric = Math.max(0.1, Math.round(Number(nu.metric || (cat === 'maggot' ? 8 : 7)) * 10) / 10);
    const mU = cat === 'maggot' ? 'mm' : 'cm';
    const species = nu.species || (cat === 'ternak' ? 'Ikan Lele' : (cat === 'maggot' ? 'Maggot BSF' : 'Cabai Rawit'));
    const population = nu.population || (cat === 'ternak' ? '200 ekor' : (cat === 'maggot' ? '1 biopond' : '15 polybag'));
    const statusNote = nu.statusNote || 'Sehat & Aktif';

    // Cek apakah unit sudah pernah dimasukkan (mencegah duplikat bila terkirim 2 kali)
    const existing = (state.units || []).find(u => {
      if (u.category !== cat) return false;
      const uName = (u.name || '').toLowerCase().trim();
      const nName = (nu.name || '').toLowerCase().trim();
      if (uName === nName) return true;
      if (uName.includes(nName) || nName.includes(uName)) return true;
      const uHasNum = /\d+/.test(uName);
      const nHasNum = /\d+/.test(nName);
      if (!uHasNum && !nHasNum && u.species.toLowerCase() === species.toLowerCase()) return true;
      return false;
    });

    if (existing) {
      // Unit SUDAH ADA SEBELUMNYA!
      const isIdentical = Math.abs(Number(existing.metric) - Number(uMetric)) < 0.1 &&
                          Number(existing.ageDays) === Number(uAge);
      if (isIdentical) {
        // Terkirim 2 kali / data identik -> VERIFIKASI ULANG!
        reverified.push(`• *${existing.name}* (${existing.species}, ${existing.population}, Hr ${existing.ageDays}, ${existing.metric} ${mU}) — *Sudah aktif di sistem*`);
      } else {
        // Pembaruan data unit yang ada
        existing.metric = uMetric;
        existing.ageDays = uAge;
        existing.startDate = getWibNow(-(uAge - 1)).dateKey;
        if (population) existing.population = population;
        if (statusNote) existing.statusNote = statusNote;
        if (!Array.isArray(existing.history)) existing.history = [];
        existing.history.push(uMetric);
        if (existing.history.length > 12) existing.history.shift();
        updated.push(`• *${existing.name}* -> Hr ${existing.ageDays}, ${existing.metric} ${mU} (${existing.statusNote})`);
      }
    } else {
      // Unit BARU!
      const created = createUnitFromTelegram({
        category: cat,
        species,
        name: nu.name,
        population
      }, uAge, uMetric, statusNote, '', senderName);
      newCreated.push(`• *${created.name}* (${created.species}, ${created.population}, Hr ${uAge}, ${uMetric} ${mU})`);
    }
  });

  // Update Eco Stats
  if (!state.ecoStats) state.ecoStats = { wasteKg: 0, waterLiters: 0, kasgotKg: 0 };
  const wAdd = Number(parsed.wasteKgAdd) || 0;
  const lAdd = Number(parsed.waterLitersAdd) || 0;
  const kAdd = Number(parsed.kasgotKgAdd) || 0;
  if (wAdd > 0 || lAdd > 0 || kAdd > 0) {
    if (!Array.isArray(state.ecoStatsHistory)) state.ecoStatsHistory = [];
    state.ecoStatsHistory.push({ wasteKg: Number(state.ecoStats.wasteKg || 0), waterLiters: Number(state.ecoStats.waterLiters || 0), kasgotKg: Number(state.ecoStats.kasgotKg || 0) });
    if (state.ecoStatsHistory.length > 20) state.ecoStatsHistory.shift();

    if (wAdd > 0) { state.ecoStats.wasteKg = Math.round((state.ecoStats.wasteKg + wAdd) * 10) / 10; notes.push(`♻️ Sampah ke Maggot: *+${wAdd} kg* (Total: *${state.ecoStats.wasteKg} kg*)`); }
    if (lAdd > 0) { state.ecoStats.waterLiters = Math.round(state.ecoStats.waterLiters + lAdd); notes.push(`💧 Air Kolam Daur Ulang: *+${lAdd} L* (Total: *${state.ecoStats.waterLiters} L*)`); }
    if (kAdd > 0) { state.ecoStats.kasgotKg = Math.round((state.ecoStats.kasgotKg + kAdd) * 10) / 10; notes.push(`🌱 Kasgot Terkumpul: *+${kAdd} kg* (Total: *${state.ecoStats.kasgotKg} kg*)`); }
  }

  let answer = '';
  if (newCreated.length === 0 && updated.length === 0 && reverified.length > 0) {
    // Verifikasi ulang bahwa data sudah pernah dimasukkan / terkirim 2 kali
    answer = `⚠️ *Verifikasi Ulang: Data Sudah Pernah Tercatat Sebelumnya!*\n\n` +
      `Sistem mendeteksi data yang Anda kirimkan telah tercatat sebelumnya di AgroSync AI:\n\n` +
      reverified.join('\n') +
      `\n\n🛡️ *Perlindungan Duplikasi:* Data tidak diduplikasi/digandakan. Semua unit di atas tetap aktif dan terjadwal sesuai jam kantor (07:30–16:00 WIB) di Web App.`;
  } else if (newCreated.length > 0 || updated.length > 0 || reverified.length > 0) {
    const sections = [];
    if (notes.length > 0) sections.push(notes.join('\n'));
    if (newCreated.length > 0) sections.push(`✨ *Unit Baru Berhasil Ditambahkan ke Web App:*\n${newCreated.join('\n')}`);
    if (updated.length > 0) sections.push(`🔄 *Pembaruan Data Unit:*\n${updated.join('\n')}`);
    if (reverified.length > 0) sections.push(`ℹ️ *Verifikasi Ulang (Unit Sudah Pernah Ada):*\n${reverified.join('\n')}`);

    answer = `✅ *Data Berhasil Disimpan & Tersinkron ke Web App!*\n\n${sections.join('\n\n')}\n\n_Pelapor: ${senderName} • Jadwal pemeliharaan jam kantor (07:30–16:00 WIB) telah otomatis aktif._`;
  }

  if (answer) {
    addActivityLog('ai', 'AI Data Sync (TG)', `Sinkronisasi Data Telegram (${senderName})`, rawQuestion.slice(0, 90));
    saveState(state);
    return { answer, count: newCreated.length + updated.length + reverified.length };
  }
  return { answer: '', count: 0 };
}

async function answerTelegramQuestionWithData(token, chatId, question, senderName) {
  const stopTyping = startTyping(token, chatId, 'typing');
  try {
    syncRealtimeUnitAges(state);
  // 1. Cek terlebih dahulu apakah pesan merupakan input data natural lokal singkat
  const localLoggedReply = tryLocalNaturalDataEntry(question, senderName);
  if (localLoggedReply) {
    const sRes = await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: localLoggedReply,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '📊 Lihat Ringkasan Panen & Eco', callback_data: 'menu:harvest' }, { text: '🏠 Menu Utama', callback_data: 'menu:home' }]] }
    });
    console.log(`[Telegram Bot] Fast log replied to ${chatId}:`, sRes && sRes.ok ? 'OK' : sRes.description);
    return;
  }
  syncRealtimeUnitAges(state);
  const aiCfg = (state && state.aiConfig) || {};
  const wd = getIndonesiaWorkdayInfo();
  const units = (state && Array.isArray(state.units)) ? state.units : [];
  const scheds = (state && Array.isArray(state.schedules)) ? state.schedules : [];
  const harvests = (state && Array.isArray(state.harvestHistory)) ? state.harvestHistory : [];
  const eco = (state && state.ecoStats) || { wasteKg: 0, waterLiters: 0, kasgotKg: 0 };

  // Deteksi apakah pesan pengguna merupakan pengiriman / laporan data budidaya
  const isDataSubmission = /(?:berikut|data|daftar|jenis\s*tanaman|tanaman|komoditas|sayur|bibit|benih|maggot|bsf|biopond|kolam|lele|nila|ikan|pohon|pekarangan|polybag|polibag|bedeng|cabai|cabe|terong|tomat|kangkung|pakcoy|sawi|bayam|mangga|jambu|alpukat|catat|input|masuk|tambah)/i.test(question) &&
    !/^(apakah|bagaimana|gimana|kenapa|mengapa|apa\s+(?:itu|maksud|fungsi|kegunaan)|siapa\s)/i.test(question.trim());

  if (isDataSubmission) {
    let syncRes = null;
    // Engine 1: AI LLM Extraction
    if (aiCfg.enabled && aiCfg.apiKey && aiCfg.baseUrl) {
      try {
        const endpoint = aiCfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
        const strictPrompt = `Kamu sistem parser database AgroSync AI Kapanewon Pengasih.
TUGAS: Pengguna mengirimkan data budidaya riil (maggot, sayuran, ternak, pohon buah pekarangan).
Ekstrak SEMUA unit budidaya ke format JSON valid.
DILARANG KERAS membalas teks artikel, komentar, atau sapaan!
Keluaran WAJIB 100% JSON valid:
{
  "intent": "log_data",
  "replaceExistingUnits": false,
  "newUnits": [
    {
      "category": "ternak|maggot|tanaman",
      "species": "nama jenis (Ikan Lele|Maggot BSF|Cabai Rawit|Terong Ungu|Tomat Rampai|Kangkung Budikdamber|Pohon Mangga|Pohon Jambu dll)",
      "name": "nama unit lengkap (contoh: Biopond Maggot BSF 1, Bedeng Cabai Rawit, Pohon Mangga Pekarangan)",
      "population": "jumlah populasi (contoh: 20 polybag, 1 pohon, 1 biopond, 250 ekor)",
      "ageDays": 10,
      "metric": 15.0,
      "statusNote": "Sehat & Aktif"
    }
  ],
  "updateUnits": [],
  "wasteKgAdd": 0,
  "waterLitersAdd": 0,
  "kasgotKgAdd": 0,
  "confirmMsg": "Ringkasan ramah data yang diekstrak"
}
Catatan: Set replaceExistingUnits: true JIKA pengguna meminta mengganti data lama/reset.`;

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.apiKey.trim() },
          body: JSON.stringify({
            model: aiCfg.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
            max_tokens: 3500,
            temperature: 0.1,
            messages: [
              { role: 'system', content: strictPrompt },
              { role: 'user', content: question }
            ]
          })
        });
        const data = await resp.json();
        const choiceMsg = data && data.choices && data.choices[0] && data.choices[0].message;
        const rawContent = choiceMsg ? (choiceMsg.content || choiceMsg.reasoning_content || '') : '';
        let parsed = null;
        try {
          const codeBlock = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlock) {
            parsed = JSON.parse(codeBlock[1].trim());
          } else {
            const firstBrace = rawContent.indexOf('{');
            const lastBrace = rawContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              parsed = JSON.parse(rawContent.slice(firstBrace, lastBrace + 1).trim());
            }
          }
        } catch (e) {}

        if (parsed && Array.isArray(parsed.newUnits) && parsed.newUnits.length > 0) {
          syncRes = processExtractedUnits(parsed, question, senderName);
        }
      } catch (err) {
        console.error('[AI Data Extraction Error]:', err.message);
      }
    }

    // Engine 2: Rule-Based Extractor (Dual-Engine Fallback)
    if (!syncRes || syncRes.count === 0) {
      const ruleData = extractUnitsFromTextRuleBased(question, senderName);
      if (ruleData.units && ruleData.units.length > 0) {
        syncRes = processExtractedUnits({
          intent: 'log_data',
          replaceExistingUnits: /(?:ganti|menggantikan|reset)/i.test(question),
          newUnits: ruleData.units,
          wasteKgAdd: ruleData.wasteKg,
          waterLitersAdd: ruleData.waterLiters,
          kasgotKgAdd: ruleData.kasgotKg
        }, question, senderName);
      }
    }

    if (syncRes && syncRes.answer) {
      const sRes = await tgApi(token, 'sendMessage', {
        chat_id: chatId,
        text: syncRes.answer,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📊 Lihat Ringkasan Panen & Eco', callback_data: 'menu:harvest' }, { text: '🏠 Menu Utama', callback_data: 'menu:home' }]] }
      });
      console.log(`[Telegram Bot] Data sync replied to ${chatId}:`, sRes && sRes.ok ? 'BERHASIL' : (sRes && sRes.description));
      return;
    }
  }

  let answer = '';
  if (aiCfg.enabled && aiCfg.apiKey && aiCfg.baseUrl && aiCfg.baseUrl.startsWith('https://')) {
    try {
      const unitCtx = units.map(u => {
        const left = Math.max(0, (u.targetDays || 30) - (u.ageDays || 1));
        const mU = u.category === 'maggot' ? 'mm' : 'cm';
        return `${u.name} (${u.species}, ${u.population}): umur Hr ${u.ageDays}/${u.targetDays} (${left === 0 ? 'Siap Panen' : 'sisa ' + left + ' hr'}), ukuran ${u.metric} ${mU}, riwayat [${(u.history || []).slice(-4).join(',')}], status: ${u.statusNote}`;
      }).join(' | ') || 'belum ada unit tersimpan';
      const schedCtx = scheds.map(s => `${s.time} ${s.title} (${s.freq}) [${s.done ? 'Selesai oleh ' + (s.doneBy || 'Tim') : 'Belum'}]`).join('; ') || 'kosong';
      const harvCtx = harvests.slice(0, 4).map(h => `${h.unitName} (${h.dateStr}, ${h.metric}${h.metricUnit || 'cm'})`).join('; ') || 'belum ada';
      const wCtx = state.weatherData && state.weatherData.current ? `Cuaca: ${state.weatherData.current.temp}C ${state.weatherData.current.desc}.` : '';

      const endpoint = aiCfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const systemPrompt = `Kamu Asisten AgroSync AI Kapanewon Pengasih di Telegram. ${GROUNDED_AI_STANDARDS}
Jawab pertanyaan/konsultasi pengguna dalam bahasa Indonesia ramah, solutif, berdasarkan data aplikasi.`;

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.apiKey.trim() },
        body: JSON.stringify({
          model: aiCfg.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
          max_tokens: 3500,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Hari: ${wd.dayName} ${wd.dateKey} (${wd.isHoliday ? 'Libur: ' + wd.reason : 'Hari Kerja Kantor'}). ${wCtx}\nUNIT AKTIF: ${unitCtx}\nJADWAL: ${schedCtx}\nRIWAYAT PANEN: ${harvCtx}\nECO: sampah ${eco.wasteKg}kg, air kolam ${eco.waterLiters}L, kasgot ${eco.kasgotKg}kg\n\nPesan dari ${senderName}: ${question}` }
          ]
        })
      });
      const data = await resp.json();
      const choiceMsg = data && data.choices && data.choices[0] && data.choices[0].message;
      const content = choiceMsg ? (choiceMsg.content || choiceMsg.reasoning_content || '') : '';
      if (content && content.trim()) {
        answer = '🤖 *Jawaban AgroSync AI:*\n' + content.trim();
        addActivityLog('ai', 'AI Chat (TG)', `Pertanyaan Telegram (${senderName})`, question.slice(0, 80));
        saveState(state);
      }
    } catch (err) {
      console.error('[Telegram Q&A] AI Error:', err.message);
    }
  }

  if (!answer) {
    answer = generateLocalTelegramAnswer(question, state);
  }

    const sRes = await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: answer,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🏠 Menu Utama', callback_data: 'menu:home' }, { text: '📸 Kirim Foto Cek AI', callback_data: 'menu:photo' }]] }
    });
    console.log(`[Telegram Bot] Balasan terkirim ke ${chatId}:`, sRes && sRes.ok ? 'BERHASIL' : (sRes && sRes.description));
  } finally {
    stopTyping();
  }
}

let pollingActive = false;
async function pollTelegramUpdates() {
  if (pollingActive) return;
  if (!state || !state.telegram || !state.telegram.enabled || !state.telegram.token) return;
  pollingActive = true;
  const token = state.telegram.token.trim();
  try {
    if (!telegramCommandsRegistered) {
      telegramCommandsRegistered = true;
      tgApi(token, 'setMyCommands', {
        commands: [
          { command: 'start', description: 'Buka Menu Utama AgroSync AI' },
          { command: 'foto', description: 'Analisis Foto Pertumbuhan & Gejala Penyakit' },
          { command: 'form', description: 'Isi Form Tambah / Update Unit' },
          { command: 'jadwal', description: 'Lihat Jadwal Sudah & Belum Dikerjakan' },
          { command: 'panen', description: 'Ringkasan Panen, Kurva & Dampak Lingkungan' },
          { command: 'pdf', description: 'Unduh Laporan PDF Lengkap' }
        ]
      }).catch(() => {});
    }

    const res = await tgApi(token, 'getUpdates', { offset: telegramOffset, timeout: 10 });
    if (res && res.ok && Array.isArray(res.result)) {
      const { timeKey } = getWibNow();
      for (const upd of res.result) {
        telegramOffset = upd.update_id + 1;

        // 1. Handle Inline Button Callbacks
        if (upd.callback_query && upd.callback_query.data) {
          const cb = upd.callback_query;
          const data = cb.data;
          const chatId = cb.message ? cb.message.chat.id : cb.from.id;
          const fallbackName = [cb.from.first_name, cb.from.last_name].filter(Boolean).join(' ');
          const actorName = findUserNameByChatId(state, chatId, fallbackName);

          if (data.startsWith('done:')) {
            const taskId = data.slice(5);
            const task = markTaskDoneById(taskId, actorName, timeKey);
            await tgApi(token, 'answerCallbackQuery', {
              callback_query_id: cb.id,
              text: task ? 'Tugas ditandai selesai & tersinkron ke web!' : 'Tugas tidak ditemukan.'
            });
            if (task) {
              await broadcastTelegram(token, `✅ *Tugas Selesai & Tersinkron!*\n• ${task.title} (${task.unitName})\n• Pelaksana: *${actorName}* (${timeKey} WIB)`);
            }
            continue;
          }

          await tgApi(token, 'answerCallbackQuery', { callback_query_id: cb.id });

          if (data === 'menu:home') { tgSessions.delete(String(chatId)); await sendTelegramMainMenu(token, chatId); continue; }
          if (data === 'menu:cancel') { tgSessions.delete(String(chatId)); await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Dibatalkan. Silakan pilih menu lain:', reply_markup: getMainInlineKeyboard() }); continue; }
          if (data === 'menu:photo') { await startTelegramPhotoFlow(token, chatId); continue; }
          if (data === 'menu:form') { await startTelegramFormMenu(token, chatId); continue; }
          if (data === 'menu:schedule') { await sendTelegramScheduleView(token, chatId); continue; }
          if (data === 'menu:harvest') { await sendTelegramHarvestAndEcoSummary(token, chatId); continue; }
          if (data === 'menu:pdf') { await sendTelegramPdfExport(token, chatId); continue; }

          if (data.startsWith('photo_unit:')) {
            const uid = data.slice(11);
            tgSessions.set(String(chatId), { mode: 'photo', unitId: uid });
            const u = (state.units || []).find(x => x.id === uid);
            await tgApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `📸 Silakan kirim *foto* sekarang${u ? ` untuk *${u.name}*` : ' (AI akan mendeteksi unit otomatis)'}.\n_Caption/gejala boleh dikosongkan — AI tetap menganalisis gambar secara cermat!_`,
              parse_mode: 'Markdown'
            });
            continue;
          }

          if (data === 'form:add_start') {
            tgSessions.set(String(chatId), { mode: 'add_unit', step: 'cat' });
            await tgApi(token, 'sendMessage', {
              chat_id: chatId,
              text: '➕ *Tambah Unit Baru (Langkah 1/5)*\nPilih kelompok unit:',
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🐟 Ternak / Ikan', callback_data: 'form_cat:ternak' }],
                  [{ text: '🪱 Maggot / Pakan Alami', callback_data: 'form_cat:maggot' }],
                  [{ text: '🌱 Tanaman Pekarangan', callback_data: 'form_cat:tanaman' }],
                  [{ text: '❌ Batal', callback_data: 'menu:cancel' }]
                ]
              }
            });
            continue;
          }

          if (data.startsWith('form_cat:')) {
            const cat = data.slice(9);
            const types = (state.types && state.types[cat]) || [];
            tgSessions.set(String(chatId), { mode: 'add_unit', step: 'species', category: cat });
            const rows = types.map((t, idx) => ([{ text: t.name, callback_data: `form_sp:${cat}:${idx}` }]));
            rows.push([{ text: '❌ Batal', callback_data: 'menu:cancel' }]);
            await tgApi(token, 'sendMessage', {
              chat_id: chatId,
              text: '➕ *Tambah Unit Baru (Langkah 2/5)*\nPilih jenis komoditas:',
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: rows }
            });
            continue;
          }

          if (data.startsWith('form_sp:')) {
            const parts = data.split(':');
            const cat = parts[1];
            const idx = parseInt(parts[2], 10);
            const tObj = ((state.types && state.types[cat]) || [])[idx];
            const species = tObj ? tObj.name : 'Umum';
            tgSessions.set(String(chatId), { mode: 'add_unit', step: 'name', category: cat, species });
            await tgApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `➕ *Tambah Unit Baru (Langkah 3/5)*\nJenis: *${species}*\n\nKetik *Nama Unit / Lokasi* (contoh: \`Kolam Bis Sumur 4\` atau \`Bedeng Cabai Timur\`):`,
              parse_mode: 'Markdown'
            });
            continue;
          }

          if (data === 'form:edit_list') {
            const units = (state && Array.isArray(state.units)) ? state.units : [];
            const rows = units.slice(0, 10).map(u => ([{ text: `✏️ ${u.name} (${u.metric} ${u.category === 'maggot' ? 'mm' : 'cm'})`, callback_data: `form_edit:${u.id}` }]));
            rows.push([{ text: '❌ Batal', callback_data: 'menu:cancel' }]);
            await tgApi(token, 'sendMessage', {
              chat_id: chatId,
              text: '✏️ *Pilih unit yang ingin diperbarui ukuran/kondisinya:*',
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: rows }
            });
            continue;
          }

          if (data.startsWith('form_edit:')) {
            const uid = data.slice(10);
            const u = (state.units || []).find(x => x.id === uid);
            if (u) {
              tgSessions.set(String(chatId), { mode: 'edit_unit', unitId: uid });
              const mU = u.category === 'maggot' ? 'mm' : 'cm';
              await tgApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `✏️ *Update ${u.name}*\nData kini: Umur Hr ${u.ageDays}, Ukuran ${u.metric} ${mU}, Status: ${u.statusNote}\n\nBalas dengan format:\n\`ukuran, kondisi baru\`\nContoh: \`18.5, Sehat makan lahap\`\n_(atau ketik \`batal\` untuk membatalkan)_`,
                parse_mode: 'Markdown'
              });
            }
            continue;
          }
          continue;
        }

        // 2. Handle Photo Messages
        if (upd.message && Array.isArray(upd.message.photo) && upd.message.photo.length > 0) {
          await handleTelegramPhotoMessage(token, upd.message, timeKey);
          continue;
        }

        // 3. Handle Text Messages & Persistent Reply Keyboard Buttons
        if (upd.message && upd.message.text) {
          const chatId = upd.message.chat.id;
          const txt = upd.message.text.trim();
          const lower = txt.toLowerCase();
          const fallbackName = [upd.message.from && upd.message.from.first_name, upd.message.from && upd.message.from.last_name].filter(Boolean).join(' ');
          const actorName = findUserNameByChatId(state, chatId, fallbackName);
          console.log(`[Telegram Bot] Pesan masuk dari ${chatId} (${actorName}): "${txt.slice(0, 80).replace(/\n/g, ' ')}"`);
          tgApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});

          // Direct Menu Commands & Persistent Keyboard Buttons
          if (lower === '/start' || lower === '/menu' || lower === 'menu') {
            tgSessions.delete(String(chatId));
            await sendTelegramMainMenu(token, chatId, `Halo *${actorName}*! Selamat datang di *AgroSync AI Kapanewon Pengasih*.`);
            continue;
          }
          if (lower === '/foto' || txt.includes('Analisis Foto')) { await startTelegramPhotoFlow(token, chatId); continue; }
          if (lower === '/form' || txt.includes('Isi Form')) { await startTelegramFormMenu(token, chatId); continue; }
          if (lower === '/jadwal' || txt.includes('Jadwal (')) { await sendTelegramScheduleView(token, chatId); continue; }
          if (lower === '/panen' || txt.includes('Panen, Kurva')) { await sendTelegramHarvestAndEcoSummary(token, chatId); continue; }
          if (lower === '/pdf' || txt.includes('Ekspor Laporan PDF')) { await sendTelegramPdfExport(token, chatId); continue; }

          if (lower === 'batal' || lower === '/batal') {
            tgSessions.delete(String(chatId));
            await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Sesi form dibatalkan.', reply_markup: getMainInlineKeyboard() });
            continue;
          }

          // Active Conversational Form Wizard
          const sess = tgSessions.get(String(chatId));
          if (sess && sess.mode === 'add_unit') {
            if (sess.step === 'name') {
              sess.name = txt.slice(0, 60);
              sess.step = 'pop';
              await tgApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `➕ *Tambah Unit Baru (Langkah 4/5)*\nNama: *${sess.name}*\n\nKetik *Jumlah / Kapasitas* (contoh: \`100 ekor\`, \`10 polybag\`, atau \`1 box maggot\`):`,
                parse_mode: 'Markdown'
              });
              continue;
            }
            if (sess.step === 'pop') {
              sess.population = txt.slice(0, 60);
              sess.step = 'metrics';
              const mU = sess.category === 'maggot' ? 'mm' : 'cm';
              await tgApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `➕ *Tambah Unit Baru (Langkah 5/5)*\nKetik *Umur (hari), Ukuran (${mU})* dipisah koma (contoh: \`14, 10.5\`)\n\n_Atau langsung kirim **FOTO** unit agar AI memperkirakan umur & ukurannya secara otomatis!_`,
                parse_mode: 'Markdown'
              });
              continue;
            }
            if (sess.step === 'metrics') {
              const nums = txt.match(/[\d.]+/g) || [];
              const ageDays = Math.max(1, parseInt(nums[0], 10) || 1);
              const metric = Math.max(0.1, parseFloat(nums[1]) || 10);
              const newUnit = createUnitFromTelegram(sess, ageDays, metric, 'Sehat & Aktif', '', actorName);
              tgSessions.delete(String(chatId));
              await tgApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `✅ *Unit Baru Berhasil Disimpan & Tersinkron ke Web!*\n• Nama: *${newUnit.name}*\n• Jenis: ${newUnit.species}\n• Kapasitas: ${newUnit.population}\n• Umur Realtime: Hr ${newUnit.ageDays} | Ukuran: ${newUnit.metric} ${newUnit.category === 'maggot' ? 'mm' : 'cm'}`,
                parse_mode: 'Markdown',
                reply_markup: getMainInlineKeyboard()
              });
              continue;
            }
          }

          if (sess && sess.mode === 'edit_unit') {
            const u = (state.units || []).find(x => x.id === sess.unitId);
            if (u) {
              const parts = txt.split(',');
              const newM = parseFloat((parts[0] || '').replace(',', '.'));
              const newStatus = (parts.slice(1).join(',') || '').trim();
              if (!isNaN(newM) && newM > 0) {
                u.metric = newM;
                if (!Array.isArray(u.history)) u.history = [];
                u.history.push(newM);
                if (u.history.length > 12) u.history.shift();
              }
              if (newStatus) u.statusNote = newStatus.slice(0, 60);
              addActivityLog('human', actorName, 'Update Unit via Telegram', `${u.name}: ${u.metric}, ${u.statusNote}`);
              saveState(state);
              tgSessions.delete(String(chatId));
              await tgApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `✅ *Data ${u.name} Diperbarui & Tersinkron ke Web!*\n• Ukuran Kini: *${u.metric} ${u.category === 'maggot' ? 'mm' : 'cm'}*\n• Kondisi: *${u.statusNote}*`,
                parse_mode: 'Markdown',
                reply_markup: getMainInlineKeyboard()
              });
              continue;
            }
          }

          // Quick task completion via /selesai or replying "selesai"
          let taskId = '';
          if (lower.startsWith('/selesai ')) {
            taskId = txt.split(/\s+/)[1] || '';
          } else if (upd.message.reply_to_message && /(selesai|sudah|done|beres|ok)/i.test(lower)) {
            taskId = msgToTaskMap.get(`${chatId}:${upd.message.reply_to_message.message_id}`) || '';
          }

          if (taskId) {
            const task = markTaskDoneById(taskId, actorName, timeKey);
            if (task) {
              await broadcastTelegram(token, `✅ *Tugas Selesai & Tersinkron!*\n• ${task.title} (${task.unitName})\n• Pelaksana: *${actorName}* (${timeKey} WIB)`);
            } else {
              await tgApi(token, 'sendMessage', { chat_id: chatId, text: 'Kode tugas tidak ditemukan.' });
            }
          } else {
            await answerTelegramQuestionWithData(token, chatId, txt, actorName);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Telegram Polling Error]:', err.message);
  } finally {
    pollingActive = false;
  }
}

// ==================== 3. HTTP SERVER ====================
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; " +
    "font-src https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'self';"
  );
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/api/report/pdf' && req.method === 'GET') {
    try {
      syncRealtimeUnitAges(state);
      const pdfBuf = buildAgroSyncPdfBuffer(state || {});
      const { dateKey } = getWibNow();
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Laporan_AgroSync_Kapanewon_Pengasih_${dateKey}.pdf"`,
        'Content-Length': pdfBuf.length
      });
      res.end(pdfBuf);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  if (urlPath === '/api/backups' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse().map(f => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return { file: f, sizeKb: Math.max(1, Math.round(st.size / 1024)) };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, backups: files }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, backups: [] }));
    }
    return;
  }

  if (urlPath === '/api/restore' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 8192) req.destroy(); });
    req.on('end', () => {
      try {
        const { file } = JSON.parse(body || '{}');
        const safeName = path.basename(String(file || ''));
        const fpath = path.join(BACKUP_DIR, safeName);
        if (!safeName.endsWith('.json') || !fs.existsSync(fpath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'File backup tidak ditemukan.' }));
          return;
        }
        runServerAutoBackup('pre-restore-' + Date.now());
        const restored = JSON.parse(fs.readFileSync(fpath, 'utf8'));
        saveState(restored);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, updatedAt: state.updatedAt }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Gagal memulihkan backup.' }));
      }
    });
    return;
  }

  if (urlPath === '/api/health' && req.method === 'GET') {
    const wib = getWibNow();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, mode: 'nodejs', version: '3.0', port: PORT, timeWib: wib, workday: getIndonesiaWorkdayInfo(wib.dateKey) }));
    return;
  }

  if (urlPath === '/api/telegram' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 256 * 1024) req.destroy(); });
    req.on('end', async () => {
      try {
        const { token, method, payload } = JSON.parse(body || '{}');
        const cleanTok = String(token || '').trim();
        const allowedMethods = ['getMe', 'getUpdates', 'sendMessage', 'setWebhook', 'deleteWebhook', 'setMyCommands'];
        // Validasi format token Telegram: angka:string(30-60 char)
        if (!cleanTok || !allowedMethods.includes(method) || !/^\d{6,12}:[A-Za-z0-9_\-]{30,60}$/.test(cleanTok)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, description: 'Token atau metode Telegram tidak valid.' }));
          return;
        }
        const data = await tgApi(cleanTok, method, payload || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, description: 'Proxy Telegram gagal: ' + err.message }));
      }
    });
    return;
  }

  if (urlPath === '/api/ai' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 12 * 1024 * 1024) req.destroy(); });
    req.on('end', async () => {
      try {
        const { baseUrl, apiKey, model, messages, max_tokens, temperature } = JSON.parse(body || '{}');
        const cleanUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
        const cleanKey = String(apiKey || '').trim();
        if (!isSafeExternalHttpsUrl(cleanUrl) || !cleanKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'URL Base (https://) dan API Key wajib diisi.' } }));
          return;
        }
        // Sanitasi parameter AI
        const cleanModel = String(model || 'gpt-4o-mini').replace(/[^\w.\-\/]/g, '').slice(0, 128);
        const cleanMaxTokens = Math.min(Math.max(Number(max_tokens) || 450, 50), 4096);
        const cleanTemp = Math.min(Math.max(typeof temperature === 'number' ? temperature : 0.3, 0), 2);
        const cleanMessages = Array.isArray(messages) ? messages.slice(0, 50) : [];
        const resp = await fetch(cleanUrl + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cleanKey },
          body: JSON.stringify({
            model: cleanModel,
            messages: cleanMessages,
            max_tokens: cleanMaxTokens,
            temperature: cleanTemp
          })
        });
        const text = await resp.text();
        res.writeHead(resp.status, { 'Content-Type': 'application/json' });
        res.end(text);
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Proxy server gagal menghubungi endpoint AI: ' + err.message } }));
      }
    });
    return;
  }

  if (urlPath === '/api/models' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 65536) req.destroy(); });
    req.on('end', async () => {
      try {
        const { baseUrl, apiKey } = JSON.parse(body || '{}');
        const cleanUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
        const cleanKey = String(apiKey || '').trim();
        if (!isSafeExternalHttpsUrl(cleanUrl) || !cleanKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'URL Base (https://) dan API Key wajib diisi.' }));
          return;
        }
        const resp = await fetch(cleanUrl + '/models', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + cleanKey }
        });
        const data = await resp.json();
        const rawList = Array.isArray(data && data.data) ? data.data : (Array.isArray(data && data.models) ? data.models : []);
        const models = rawList.map(m => (typeof m === 'string' ? m : (m.id || m.name || ''))).filter(Boolean);
        res.writeHead(resp.ok ? 200 : resp.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: resp.ok && models.length > 0, models, error: !resp.ok ? ((data && data.error && data.error.message) || 'Gagal memuat model') : '' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (urlPath === '/api/state' && req.method === 'GET') {
    if (state && syncRealtimeUnitAges(state)) saveState(state);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state || {}));
    return;
  }

  if (urlPath === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        // Jangan timpa data users yang tersimpan di server dengan data dari client
        // (password tidak dikirim client - lihat pushStateToServer di index.html)
        if (state && Array.isArray(state.users) && (!incoming.users || !Array.isArray(incoming.users))) {
          incoming.users = state.users;
        }
        saveState(incoming);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, updatedAt: state.updatedAt }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'JSON tidak valid' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && (urlPath === '/' || urlPath === '/index.html')) {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(PUBLIC_HTML, 'utf8'));
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
  console.log(`[AgroSync AI v3.0] Server Node.js aktif di http://${HOST}:${PORT}`);
});

setInterval(runScheduledJobs, 30 * 1000);
setInterval(pollTelegramUpdates, 4 * 1000);
