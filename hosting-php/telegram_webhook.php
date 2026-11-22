<?php
// AgroSync AI — Telegram 2-Way Webhook untuk Shared Hosting cPanel (PHP)
// Daftarkan sekali: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://domainanda.com/telegram_webhook.php
date_default_timezone_set('Asia/Jakarta');

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

$stateFile = __DIR__ . '/data/state.json';
if (!file_exists($stateFile)) { http_response_code(200); exit; }

$state = json_decode(file_get_contents($stateFile), true);
$token = trim($state['telegram']['token'] ?? '');
if (!$token) { http_response_code(200); exit; }
// Validasi format token Telegram
if (!preg_match('/^\d{6,12}:[A-Za-z0-9_\-]{30,60}$/', $token)) { http_response_code(200); exit; }

$upd = json_decode(file_get_contents('php://input'), true);
if (!$upd) { http_response_code(200); exit; }

function tg_post($token, $method, $payload) {
    $ch = curl_init("https://api.telegram.org/bot" . urlencode($token) . "/" . $method);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 10
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return $res;
}

function get_targets($state) {
    $ids = [];
    if (!empty($state['telegram']['chatId'])) { foreach (preg_split('/[,;\s]+/', $state['telegram']['chatId']) as $cid) { if (trim($cid) !== '') $ids[] = trim($cid); } }
    foreach (($state['users'] ?? []) as $u) {
        if (!empty($u['telegramChatId'])) $ids[] = trim($u['telegramChatId']);
    }
    return array_values(array_unique($ids));
}

function find_user_name($state, $chatId, $fallback) {
    foreach (($state['users'] ?? []) as $u) {
        if (trim($u['telegramChatId'] ?? '') === (string)$chatId) return $u['name'];
    }
    return $fallback ?: 'Pengguna Telegram';
}

$timeNow = date('H:i');
$taskId = '';
$doneBy = '';
$callbackId = '';
$replyChatId = '';


// Handle Foto Hama/Penyakit yang dikirim langsung ke Telegram Bot (PHP Webhook)
if (!empty($upd['message']['photo']) && is_array($upd['message']['photo'])) {
    $chatId = $upd['message']['chat']['id'];
    $caption = trim($upd['message']['caption'] ?? '');
    $fb = trim(($upd['message']['from']['first_name'] ?? '') . ' ' . ($upd['message']['from']['last_name'] ?? ''));
    $sender = find_user_name($state, $chatId, $fb);
    $photos = $upd['message']['photo'];
    $chosen = $photos[min(count($photos) - 1, 2)];
    $fileInfo = json_decode(tg_post($token, 'getFile', ['file_id' => $chosen['file_id']]), true);
    $filePath = $fileInfo['result']['file_path'] ?? '';
    $diagnosis = 'Foto tercatat ke Web App. Aktifkan API Key AI Vision di Konfigurasi untuk analisis otomatis.';
    $treatment = 'Pantau kondisi visual sesuai standar KKP/IPB Digitani.';
    $risk = 'warn';
    $dataUrl = '';
    if ($filePath) {
        $imgBin = @file_get_contents("https://api.telegram.org/file/bot" . urlencode($token) . "/" . $filePath);
        if ($imgBin) $dataUrl = 'data:image/jpeg;base64,' . base64_encode($imgBin);
    }
    $aiCfg = $state['aiConfig'] ?? [];
    if ($dataUrl && !empty($aiCfg['enabled']) && !empty($aiCfg['apiKey']) && !empty($aiCfg['baseUrl'])) {
        $ch = curl_init(rtrim($aiCfg['baseUrl'], '/') . '/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . trim($aiCfg['apiKey'])],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => $aiCfg['model'] ?? 'gpt-4o-mini', 'max_tokens' => 320, 'temperature' => 0.25,
                'messages' => [
                    ['role' => 'system', 'content' => 'Kamu ahli agronomi & akuakultur AgroSync AI (acuan KKP, IPB Digitani, PIAT UGM, BRMP). Balas HANYA JSON: {"risk":"ok|warn|danger","diagnosis":"1-2 kalimat","treatment":"1-2 kalimat"}'],
                    ['role' => 'user', 'content' => [['type' => 'text', 'text' => "Keterangan: " . ($caption ?: 'Cek hama/penyakit')], ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]]]]
                ]
            ])
        ]);
        $aiRaw = curl_exec($ch); curl_close($ch);
        $aiJson = json_decode($aiRaw, true);
        $txt = $aiJson['choices'][0]['message']['content'] ?? '';
        if (preg_match('/\{[\s\S]*\}/', $txt, $m)) {
            $p = json_decode($m[0], true);
            if (!empty($p['diagnosis'])) { $diagnosis = $p['diagnosis']; $treatment = $p['treatment'] ?? $treatment; $risk = $p['risk'] ?? 'warn'; }
        }
    }
    if (!isset($state['photoLogs']) || !is_array($state['photoLogs'])) $state['photoLogs'] = [];
    array_unshift($state['photoLogs'], [
        'id' => 'ptg_' . time(), 'unitId' => '', 'unitName' => $caption ?: "Foto Telegram ($sender)",
        'ageDays' => $state['simDay'] ?? 1, 'metricStr' => 'Via Telegram', 'engine' => 'AI Vision (TG)',
        'dateStr' => 'Hari ini ' . $timeNow . ' WIB', 'risk' => $risk, 'summary' => $diagnosis, 'photoDataUrl' => $dataUrl
    ]);
    $state['photoLogs'] = array_slice($state['photoLogs'], 0, 9);
    $state['updatedAt'] = round(microtime(true) * 1000);
    file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    tg_post($token, 'sendMessage', ['chat_id' => $chatId, 'parse_mode' => 'Markdown', 'text' => "🔍 *Hasil Deteksi Foto AgroSync AI*\n*Diagnosis:* {$diagnosis}\n*Penanganan:* {$treatment}\n\n_Tersinkron ke Web App._"]);
    exit;
}

if (!empty($upd['callback_query']['data']) && strpos($upd['callback_query']['data'], 'done:') === 0) {
    $taskId = substr($upd['callback_query']['data'], 5);
    $callbackId = $upd['callback_query']['id'];
    $replyChatId = $upd['callback_query']['message']['chat']['id'] ?? $upd['callback_query']['from']['id'];
    $fb = trim(($upd['callback_query']['from']['first_name'] ?? '') . ' ' . ($upd['callback_query']['from']['last_name'] ?? ''));
    $doneBy = find_user_name($state, $replyChatId, $fb);
} elseif (!empty($upd['message']['text'])) {
    $replyChatId = $upd['message']['chat']['id'];
    $txt = trim($upd['message']['text']);
    $fb = trim(($upd['message']['from']['first_name'] ?? '') . ' ' . ($upd['message']['from']['last_name'] ?? ''));
    $doneBy = find_user_name($state, $replyChatId, $fb);
    if (stripos($txt, '/selesai ') === 0) {
        $parts = preg_split('/\s+/', $txt);
        $taskId = $parts[1] ?? '';
    } elseif (strtolower($txt) === '/jadwal' || strtolower($txt) === '/start') {
        $lines = [];
        foreach (($state['schedules'] ?? []) as $s) {
            if (empty($s['done'])) $lines[] = "• *{$s['time']}* — {$s['title']} ({$s['unitName']})\n  Balas: `/selesai {$s['id']}`";
        }
        $msg = empty($lines) ? '✅ Semua jadwal hari ini sudah selesai!' : "📋 *Jadwal Belum Selesai:*\n" . implode("\n", $lines);
        tg_post($token, 'sendMessage', ['chat_id' => $replyChatId, 'text' => $msg, 'parse_mode' => 'Markdown']);
        exit;
    }
}

if ($taskId !== '') {
    $found = null;
    foreach ($state['schedules'] as &$s) {
        if ($s['id'] === $taskId) {
            $s['done'] = true;
            $s['doneBy'] = $doneBy;
            $s['doneAt'] = $timeNow;
            $found = $s;
            break;
        }
    }
    unset($s);
    if ($callbackId) {
        tg_post($token, 'answerCallbackQuery', ['callback_query_id' => $callbackId, 'text' => $found ? 'Selesai & tersinkron ke web!' : 'Tugas tidak ditemukan.']);
    }
    if ($found) {
        $state['updatedAt'] = round(microtime(true) * 1000);
        file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        $msg = "✅ *Tugas Selesai & Tersinkron!*\n• {$found['title']} ({$found['unitName']})\n• Pelaksana: *{$doneBy}* ({$timeNow} WIB)";
        foreach (get_targets($state) as $cid) {
            tg_post($token, 'sendMessage', ['chat_id' => $cid, 'text' => $msg, 'parse_mode' => 'Markdown']);
        }
    }
}
