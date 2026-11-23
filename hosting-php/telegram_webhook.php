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
    $url = "https://api.telegram.org/bot" . urlencode($token) . "/" . $method;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 10
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    $arr = json_decode($res, true);
    if (!empty($payload['parse_mode']) && empty($arr['ok']) && $method === 'sendMessage') {
        unset($payload['parse_mode']);
        $ch2 = curl_init($url);
        curl_setopt_array($ch2, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 10
        ]);
        $res = curl_exec($ch2);
        curl_close($ch2);
    }
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
    } else {
        // Handle input data natural & ekstraksi AI via Telegram
        $handled = false;
        $q = mb_strtolower($txt, 'UTF-8');
        $notes = [];
        if (!isset($state['units']) || !is_array($state['units'])) $state['units'] = [];
        if (!isset($state['ecoStats']) || !is_array($state['ecoStats'])) $state['ecoStats'] = ['wasteKg' => 0, 'waterLiters' => 0, 'kasgotKg' => 0];

        // 1. Deteksi Cepat Tambah Unit via Regex (hanya untuk teks pendek 1 baris)
        $isComplex = (strpos($txt, "\n") !== false) || strlen($txt) > 120 || preg_match('/(berikut|sebagai berikut|kategori|daftar|ganti|menggantikan)/i', $txt);
        $isAdd = !$isComplex && preg_match('/\b(tambah|input|buat|masukkan|tebar|tanam|semai)\b/i', $txt) &&
                 preg_match('/\b(lele|nila|ikan|kolam|maggot|bsf|biopond|cabai|cabe|tomat|terong|kangkung|bayam|pakcoy|sawi|tanaman|polybag|polibag|bedeng)\b/i', $txt);
        if ($isAdd) {
            $cat = 'tanaman';
            $species = 'Cabai Rawit';
            if (preg_match('/(lele|nila|ikan|kolam|gurame|patin)/i', $txt)) {
                $cat = 'ternak';
                $species = preg_match('/nila/i', $txt) ? 'Ikan Nila' : 'Ikan Lele';
            } elseif (preg_match('/(maggot|bsf|larva|biopond)/i', $txt)) {
                $cat = 'maggot';
                $species = 'Maggot BSF';
            } else {
                $cat = 'tanaman';
                if (preg_match('/(cabai|cabe)/i', $txt)) $species = 'Cabai Rawit';
                elseif (preg_match('/terong/i', $txt)) $species = 'Terong Ungu';
                elseif (preg_match('/tomat/i', $txt)) $species = 'Tomat Rampai';
                elseif (preg_match('/kangkung/i', $txt)) $species = 'Kangkung Budikdamber';
                elseif (preg_match('/(pakcoy|sawi)/i', $txt)) $species = 'Pakcoy / Sawi';
                elseif (preg_match('/bayam/i', $txt)) $species = 'Bayam Hijau';
            }

            $unitName = '';
            if (preg_match('/(?:tambah|input|buat|masukkan|tebar|tanam|semai)\s+(?:unit\s+)?([A-Za-z0-9\s_-]+?)(?=\s+(?:tebar|tanam|sebanyak|populasi|ukuran|umur|usia|\d+\s*(?:ekor|polybag|polibag|kg|bibit|benih|cm|mm|hari))|$)/i', $txt, $nmMatch)) {
                $unitName = trim($nmMatch[1]);
            }
            if (strlen($unitName) < 3) {
                $cnt = count(array_filter($state['units'], function($u) use ($cat) { return ($u['category'] ?? '') === $cat; })) + 1;
                $unitName = $cat === 'ternak' ? "Kolam {$species} {$cnt}" : ($cat === 'maggot' ? "Biopond Maggot {$cnt}" : "Bedeng {$species} {$cnt}");
            }

            $pop = $cat === 'ternak' ? '200 ekor' : ($cat === 'maggot' ? '1 kg' : '15 polybag');
            if (preg_match('/(\d+)\s*(ekor|bibit|benih|polybag|polibag|pot|batang|kg|box|wadah)/i', $txt, $pMatch)) {
                $pop = $pMatch[1] . ' ' . $pMatch[2];
            }

            $ageDays = 1;
            if (preg_match('/(?:umur|usia|hr|hari)\s*(\d+)/i', $txt, $aMatch) || preg_match('/(\d+)\s*(?:hari|hr)\b/i', $txt, $aMatch)) {
                $ageDays = max(1, (int)$aMatch[1]);
            }

            $metric = $cat === 'maggot' ? 8.0 : 7.0;
            if (preg_match('/(\d+(?:[.,]\d+)?)\s*(?:cm|centi|centimeter|mm|mili|milimeter)\b/i', $txt, $mMatch)) {
                $metric = (float)str_replace(',', '.', $mMatch[1]);
            }

            $newId = 'u' . time() . rand(100, 999);
            $newUnit = [
                'id' => $newId,
                'category' => $cat,
                'species' => $species,
                'name' => $unitName,
                'population' => $pop,
                'startDate' => date('Y-m-d', strtotime('-' . ($ageDays - 1) . ' days')),
                'ageDays' => $ageDays,
                'targetDays' => $cat === 'ternak' ? 60 : ($cat === 'maggot' ? 18 : 60),
                'targetSize' => $cat === 'ternak' ? 24 : ($cat === 'maggot' ? 22 : 50),
                'metric' => $metric,
                'visual1' => $cat === 'ternak' ? 'Hijau Kecokelatan (Ideal)' : ($cat === 'maggot' ? 'Gembur & Lembab Pas' : 'Hijau Segar & Tegak'),
                'visual2' => $cat === 'ternak' ? 'Tidak Bau, Makan Lahap' : ($cat === 'maggot' ? 'Aktif Makan, Tidak Bau' : 'Lembab Pas'),
                'statusNote' => 'Sehat & Aktif (Input TG)',
                'history' => [$metric],
                'checklistDone' => [false, false, false]
            ];
            $state['units'][] = $newUnit;

            // Generate jadwal jam kantor (07:30 - 16:00 WIB)
            if (!isset($state['schedules']) || !is_array($state['schedules'])) $state['schedules'] = [];
            $defTasks = $cat === 'ternak' ? [
                ['time' => '07:30', 'title' => 'Pemberian Pakan Pagi & Cek Nafsu Makan', 'freq' => 'Harian'],
                ['time' => '08:30', 'title' => 'Pengecekan Kualitas Air Kolam (Warna, Bau & Suhu)', 'freq' => 'Harian'],
                ['time' => '12:30', 'title' => 'Pemberian Pakan Siang (Pelet / Maggot)', 'freq' => 'Harian'],
                ['time' => '15:45', 'title' => 'Pemberian Pakan Sore & Cek Sirkulasi Air', 'freq' => 'Harian']
            ] : ($cat === 'maggot' ? [
                ['time' => '08:00', 'title' => 'Pemberian Sampah Organik Cacah & Cek Biopond', 'freq' => 'Harian'],
                ['time' => '13:00', 'title' => 'Pengecekan Kelembaban & Suhu Biopond', 'freq' => 'Harian'],
                ['time' => '15:30', 'title' => 'Pengadukan Media & Monitoring Kasgot', 'freq' => 'Harian']
            ] : [
                ['time' => '07:30', 'title' => 'Penyiraman Pagi (Air Kolam Daur Ulang) & Cek Hama', 'freq' => 'Harian'],
                ['time' => '09:30', 'title' => 'Pengecekan Media Tanam & Aplikasi Kasgot', 'freq' => '2 Hari Sekali'],
                ['time' => '15:30', 'title' => 'Penyiraman Sore & Pengecekan Tanah', 'freq' => 'Harian']
            ]);
            foreach ($defTasks as $dt) {
                $state['schedules'][] = [
                    'id' => 's' . time() . rand(100, 999),
                    'time' => $dt['time'],
                    'category' => $cat,
                    'unitId' => $newId,
                    'unitName' => $unitName,
                    'title' => $dt['title'],
                    'freq' => $dt['freq'],
                    'done' => false,
                    'aiGenerated' => true
                ];
            }

            $mU = $cat === 'maggot' ? 'mm' : 'cm';
            $notes[] = "✨ *Unit Baru Disimpan:*\n• Nama: *{$unitName}*\n• Komoditas: *{$species}* ({$cat})\n• Populasi: *{$pop}*\n• Umur: *Hr {$ageDays}* | Ukuran: *{$metric} {$mU}*\n• Jadwal kantor 07:30–16:00 WIB telah aktif!";
            $handled = true;
        }

        // 2. Deteksi Sampah Organik
        if (preg_match('/(?:sampah|limbah|sisa dapur|organik|mag+ot)[^\d]{0,35}(\d+(?:[.,]\d+)?)\s*(kg|kilogram|gram|gr|g)\b/i', $txt, $wM)) {
            $val = (float)str_replace(',', '.', $wM[1]);
            if (preg_match('/(gram|gr|g)/i', $wM[2])) $val = $val / 1000;
            if ($val > 0 && $val < 500) {
                $state['ecoStats']['wasteKg'] = round(($state['ecoStats']['wasteKg'] + $val) * 10) / 10;
                $notes[] = "♻️ Sampah ke Maggot: *+{$val} kg* (Total: *{$state['ecoStats']['wasteKg']} kg*)";
                $handled = true;
            }
        }

        // 3. Deteksi Air Kolam
        if (preg_match('/(?:air kolam|air lele|siram)[^\d]{0,35}(\d+(?:[.,]\d+)?)\s*(liter|ltr|l|ember)\b/i', $txt, $lM)) {
            $val = (float)str_replace(',', '.', $lM[1]);
            if (strtolower($lM[2]) === 'ember') $val = $val * 10;
            if ($val > 0 && $val < 10000) {
                $state['ecoStats']['waterLiters'] = round($state['ecoStats']['waterLiters'] + $val);
                $notes[] = "💧 Air Kolam Didaur Ulang: *+{$val} L* (Total: *{$state['ecoStats']['waterLiters']} L*)";
                $handled = true;
            }
        }

        // 4. Deteksi Pupuk Kasgot
        if (preg_match('/(?:kasgot|pupuk organik|kompos mag+ot)[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(kg|kilogram|gram|gr|g)\b/i', $txt, $kM)) {
            $val = (float)str_replace(',', '.', $kM[1]);
            if (preg_match('/(gram|gr|g)/i', $kM[2])) $val = $val / 1000;
            if ($val > 0 && $val < 500) {
                $state['ecoStats']['kasgotKg'] = round(($state['ecoStats']['kasgotKg'] + $val) * 10) / 10;
                $notes[] = "🌱 Pupuk Kasgot: *+{$val} kg* (Total: *{$state['ecoStats']['kasgotKg']} kg*)";
                $handled = true;
            }
        }

        // 5. Deteksi Update Ukuran Unit
        if (!$isAdd && preg_match('/(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/i', $txt, $sM)) {
            $numVal = (float)str_replace(',', '.', $sM[1]);
            foreach ($state['units'] as &$u) {
                $nm = mb_strtolower($u['name'] ?? '', 'UTF-8');
                $sp = mb_strtolower(explode(' ', $u['species'] ?? '')[0], 'UTF-8');
                if (stripos($txt, $nm) !== false || (strlen($sp) >= 4 && stripos($txt, $sp) !== false)) {
                    $u['metric'] = round($numVal * 10) / 10;
                    if (!isset($u['history']) || !is_array($u['history'])) $u['history'] = [];
                    $u['history'][] = $u['metric'];
                    if (count($u['history']) > 12) array_shift($u['history']);
                    $mU = ($u['category'] ?? '') === 'maggot' ? 'mm' : 'cm';
                    $notes[] = "📏 Ukuran *{$u['name']}* -> *{$u['metric']} {$mU}*";
                    $handled = true;
                    break;
                }
            }
            unset($u);
        }

        // 6. Jika belum tertangani oleh regex, panggil AI Extraction (jika API AI aktif)
        $aiCfg = $state['aiConfig'] ?? [];
        if (!$handled && !empty($aiCfg['enabled']) && !empty($aiCfg['apiKey']) && !empty($aiCfg['baseUrl'])) {
            $prompt = 'Kamu Asisten AgroSync AI Kapanewon Pengasih. Jika pesan berupa LAPORAN, INPUT DATA BARU, UPDATE DATA, ATAU ECO STATS: Balas HANYA JSON valid: {"intent":"log_data","newUnits":[{"category":"ternak|maggot|tanaman","species":"Ikan Lele|Maggot BSF|Cabai Rawit","name":"Kolam Lele 1","population":"300 ekor","ageDays":5,"metric":7.0,"statusNote":"Sehat"}],"updateUnits":[{"unitName":"nama unit","newMetric":12.0,"newAgeDays":0,"newStatus":"sehat"}],"wasteKgAdd":0,"waterLitersAdd":0,"kasgotKgAdd":0,"confirmMsg":"ringkasan data"}. Jika berupa PERTANYAAN: Jawab ramah singkat.';
            $ch = curl_init(rtrim($aiCfg['baseUrl'], '/') . '/chat/completions');
            curl_setopt_array($ch, [
                CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . trim($aiCfg['apiKey'])],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => $aiCfg['model'] ?? 'gpt-4o-mini', 'max_tokens' => 1200, 'temperature' => 0.2,
                    'messages' => [
                        ['role' => 'system', 'content' => $prompt],
                        ['role' => 'user', 'content' => "Pesan dari {$doneBy}: {$txt}"]
                    ]
                ])
            ]);
            $aiRaw = curl_exec($ch); curl_close($ch);
            $aiJson = json_decode($aiRaw, true);
            $aiTxt = $aiJson['choices'][0]['message']['content'] ?? ($aiJson['choices'][0]['message']['reasoning_content'] ?? '');
            if (preg_match('/\{[\s\S]*\}/', $aiTxt, $m)) {
                $p = json_decode($m[0], true);
                if (!empty($p) && ($p['intent'] ?? '') === 'log_data') {
                    if (!empty($p['newUnits']) && is_array($p['newUnits'])) {
                        foreach ($p['newUnits'] as $nu) {
                            if (!empty($nu['name'])) {
                                $cat = in_array($nu['category'] ?? '', ['ternak', 'maggot', 'tanaman']) ? $nu['category'] : 'tanaman';
                                $uAge = max(1, (int)($nu['ageDays'] ?? 1));
                                $uMetric = max(0.1, round((float)($nu['metric'] ?? ($cat === 'maggot' ? 8 : 7)) * 10) / 10);
                                $species = $nu['species'] ?? ($cat === 'ternak' ? 'Ikan Lele' : ($cat === 'maggot' ? 'Maggot BSF' : 'Cabai Rawit'));
                                $newUnit = [
                                    'id' => 'u' . time() . rand(100, 999),
                                    'category' => $cat,
                                    'species' => $species,
                                    'name' => $nu['name'],
                                    'population' => $nu['population'] ?? ($cat === 'ternak' ? '200 ekor' : ($cat === 'maggot' ? '1 kg' : '10 polybag')),
                                    'startDate' => date('Y-m-d', strtotime('-' . ($uAge - 1) . ' days')),
                                    'ageDays' => $uAge,
                                    'targetDays' => $cat === 'ternak' ? 60 : ($cat === 'maggot' ? 18 : 60),
                                    'targetSize' => $cat === 'ternak' ? 24 : ($cat === 'maggot' ? 22 : 50),
                                    'metric' => $uMetric,
                                    'visual1' => $cat === 'ternak' ? 'Hijau Kecokelatan' : ($cat === 'maggot' ? 'Gembur & Lembab' : 'Hijau Segar'),
                                    'visual2' => 'Normal',
                                    'statusNote' => $nu['statusNote'] ?? 'Sehat & Aktif',
                                    'history' => [$uMetric],
                                    'checklistDone' => [false, false, false]
                                ];
                                $state['units'][] = $newUnit;
                                $mU = $cat === 'maggot' ? 'mm' : 'cm';
                                $notes[] = "✨ *Unit Baru:* {$nu['name']} ({$species}, Hr {$uAge}, {$uMetric} {$mU})";
                                $handled = true;
                            }
                        }
                    }
                    $wAdd = (float)($p['wasteKgAdd'] ?? 0);
                    $lAdd = (float)($p['waterLitersAdd'] ?? 0);
                    $kAdd = (float)($p['kasgotKgAdd'] ?? 0);
                    if ($wAdd > 0) { $state['ecoStats']['wasteKg'] = round(($state['ecoStats']['wasteKg'] + $wAdd) * 10) / 10; $notes[] = "♻️ Sampah ke Maggot: *+{$wAdd} kg*"; $handled = true; }
                    if ($lAdd > 0) { $state['ecoStats']['waterLiters'] = round($state['ecoStats']['waterLiters'] + $lAdd); $notes[] = "💧 Air Kolam Didaur Ulang: *+{$lAdd} L*"; $handled = true; }
                    if ($kAdd > 0) { $state['ecoStats']['kasgotKg'] = round(($state['ecoStats']['kasgotKg'] + $kAdd) * 10) / 10; $notes[] = "🌱 Kasgot: *+{$kAdd} kg*"; $handled = true; }
                }
            }
        }

        if ($handled && count($notes) > 0) {
            $state['updatedAt'] = round(microtime(true) * 1000);
            file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            $replyMsg = "✅ *Data Berhasil Diekstrak & Tersimpan ke Sistem!*\n\n" . implode("\n", $notes) . "\n\n_Pelapor: {$doneBy} • Tersinkron ke Web App AgroSync AI._";
            tg_post($token, 'sendMessage', ['chat_id' => $replyChatId, 'text' => $replyMsg, 'parse_mode' => 'Markdown']);
            exit;
        } elseif (!$handled && !empty($aiTxt) && !preg_match('/\{[\s\S]*\}/', $aiTxt)) {
            tg_post($token, 'sendMessage', ['chat_id' => $replyChatId, 'text' => "🤖 *AgroSync AI:*\n" . trim($aiTxt), 'parse_mode' => 'Markdown']);
            exit;
        } else {
            $guideMsg = "🤖 *AgroSync AI Kapanewon Pengasih*\n\n" .
                "💡 *Format Input Data Cepat via Telegram:*\n" .
                "• `Tambah Kolam Lele 1 tebar 300 ekor ukuran 7 cm umur 5 hari`\n" .
                "• `Tanam 20 polybag cabai rawit ukuran 15 cm umur 20 hari`\n" .
                "• `Tebar Maggot BSF 2 kg umur 4 hari ukuran 8 mm`\n" .
                "• `Sampah organik 2.5 kg ke maggot`\n" .
                "• `Siram tanaman pakai air kolam 30 liter`\n" .
                "• `Panen kasgot 2 kg`\n\n" .
                "_Ketik pesan seperti contoh di atas atau kirim foto langsung untuk analisis AI!_";
            tg_post($token, 'sendMessage', ['chat_id' => $replyChatId, 'text' => $guideMsg, 'parse_mode' => 'Markdown']);
            exit;
        }
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
