<?php
// AgroSync AI — Cron Job Pengingat Telegram Otomatis untuk Shared Hosting cPanel (jalankan tiap 1 menit)
// Perintah Cron cPanel: * * * * * /usr/local/bin/php /home/USER/public_html/cron_reminder.php >/dev/null 2>&1
date_default_timezone_set('Asia/Jakarta');
$stateFile = __DIR__ . '/data/state.json';
$sentFile = __DIR__ . '/data/sent_log.json';
if (!file_exists($stateFile)) exit;

$state = json_decode(file_get_contents($stateFile), true);
if (empty($state['telegram']['enabled']) || empty($state['telegram']['token'])) exit;
$token = trim($state['telegram']['token'] ?? '');
// Validasi format token Telegram agar aman
if (!$token || !preg_match('/^\d{6,12}:[A-Za-z0-9_\-]{30,60}$/', $token)) exit;

$targets = [];
if (!empty($state['telegram']['chatId'])) { foreach (preg_split('/[,;\s]+/', $state['telegram']['chatId']) as $cid) { if (trim($cid) !== '') $targets[] = trim($cid); } }
foreach (($state['users'] ?? []) as $u) {
    if (!empty($u['telegramChatId'])) $targets[] = trim($u['telegramChatId']);
}
$targets = array_values(array_unique($targets));
if (empty($targets)) exit;

$sent = file_exists($sentFile) ? (json_decode(file_get_contents($sentFile), true) ?: []) : [];
$today = date('Y-m-d');
$nowHm = date('H:i');

$changed = false;
foreach (($state['schedules'] ?? []) as $s) {
    if (!empty($s['done'])) continue;
    if (($s['time'] ?? '') === $nowHm) {
        $key = $today . '|' . $s['id'];
        if (!empty($sent[$key])) continue;
        $sent[$key] = true;
        $changed = true;
        $text = "⏰ *Pengingat Otomatis AgroSync AI ({$s['time']} WIB)*\nUnit: {$s['unitName']}\nTugas: *{$s['title']}*\nFrekuensi: {$s['freq']}\n\n_Klik tombol di bawah jika sudah dikerjakan agar otomatis tersinkron ke web._";
        foreach ($targets as $cid) {
            $ch = curl_init("https://api.telegram.org/bot" . urlencode($token) . "/sendMessage");
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode([
                    'chat_id' => $cid,
                    'text' => $text,
                    'parse_mode' => 'Markdown',
                    'reply_markup' => ['inline_keyboard' => [[['text' => '✅ Tandai Selesai', 'callback_data' => 'done:' . $s['id']]]]]
                ]),
                CURLOPT_TIMEOUT => 10
            ]);
            curl_exec($ch);
            curl_close($ch);
        }
    }
}
if ($changed) file_put_contents($sentFile, json_encode($sent), LOCK_EX);
