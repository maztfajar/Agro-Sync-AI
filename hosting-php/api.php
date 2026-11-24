<?php
// AgroSync AI — Shared Hosting PHP Sync API (Tanpa Node.js)
// Security hardened version
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$dataDir   = __DIR__ . '/data';
$stateFile = $dataDir . '/state.json';
if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);

// ── Helper: baca body dengan batas ukuran ──
function readBody(int $maxBytes = 15 * 1024 * 1024): string {
    $raw = '';
    $fp  = fopen('php://input', 'r');
    while (!feof($fp)) {
        $chunk = fread($fp, 8192);
        $raw  .= $chunk;
        if (strlen($raw) > $maxBytes) {
            fclose($fp);
            http_response_code(413);
            echo json_encode(['ok' => false, 'error' => 'Payload terlalu besar.']);
            exit;
        }
    }
    fclose($fp);
    return $raw;
}

// ── Helper: validasi URL hanya https:// eksternal (anti-SSRF) ──
function isSafeHttpsUrl(string $url): bool {
    if (strpos($url, 'https://') !== 0) return false;
    $host = strtolower(parse_url($url, PHP_URL_HOST) ?: '');
    if (!$host) return false;
    $blocked = ['localhost','127.0.0.1','::1','0.0.0.0'];
    if (in_array($host, $blocked, true)) return false;
    if (preg_match('/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)/', $host)) return false;
    return true;
}

// ── Proxy Telegram ──
if (isset($_GET['telegram']) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $in  = json_decode(readBody(64 * 1024), true) ?: [];
    $tok = trim($in['token'] ?? '');
    $m   = $in['method'] ?? '';
    $allowed = ['getMe', 'getUpdates', 'sendMessage', 'setWebhook', 'deleteWebhook'];
    if (!$tok || !in_array($m, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'description' => 'Token atau metode Telegram tidak valid.']);
        exit;
    }
    // Validasi format token Telegram (angka:string)
    if (!preg_match('/^\d{6,12}:[A-Za-z0-9_\-]{30,60}$/', $tok)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'description' => 'Format token Telegram tidak valid.']);
        exit;
    }
    $ch = curl_init("https://api.telegram.org/bot" . rawurlencode($tok) . "/" . $m);
    curl_setopt_array($ch, [
        CURLOPT_POST            => true,
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_TIMEOUT         => 15,
        CURLOPT_SSL_VERIFYPEER  => true,
        CURLOPT_SSL_VERIFYHOST  => 2,
        CURLOPT_HTTPHEADER      => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS      => json_encode($in['payload'] ?? new stdClass())
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) {
        http_response_code(502);
        echo json_encode(['ok' => false, 'description' => 'Gagal menghubungi Telegram API.']);
        exit;
    }
    echo $raw ?: json_encode(['ok' => false, 'description' => 'Tidak ada respons dari Telegram API.']);
    exit;
}

// ── Proxy AI ──
if (isset($_GET['ai']) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $in   = json_decode(readBody(2 * 1024 * 1024), true) ?: [];
    $base = rtrim(trim($in['baseUrl'] ?? ''), '/');
    $key  = trim($in['apiKey'] ?? '');
    if (!isSafeHttpsUrl($base) || !$key) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'URL Base (https://) dan API Key wajib diisi.']]);
        exit;
    }
    // Sanitasi parameter AI
    $model      = preg_replace('/[^\w\.\-\/]/', '', $in['model'] ?? 'gpt-4o-mini');
    $maxTokens  = min(max((int)($in['max_tokens'] ?? 450), 50), 4096);
    $temperature = min(max((float)($in['temperature'] ?? 0.3), 0.0), 2.0);
    $messages   = array_slice(is_array($in['messages'] ?? null) ? $in['messages'] : [], 0, 50);

    $ch = curl_init($base . '/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST            => true,
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_SSL_VERIFYPEER  => true,
        CURLOPT_SSL_VERIFYHOST  => 2,
        CURLOPT_HTTPHEADER      => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
        CURLOPT_POSTFIELDS      => json_encode([
            'model'       => $model,
            'messages'    => $messages,
            'max_tokens'  => $maxTokens,
            'temperature' => $temperature
        ]),
        CURLOPT_TIMEOUT => 45
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Proxy PHP gagal menghubungi AI: ' . htmlspecialchars($err, ENT_QUOTES, 'UTF-8')]]);
        exit;
    }
    http_response_code($code ?: 200);
    echo $raw;
    exit;
}

// ── Ambil daftar model ──
if (isset($_GET['models']) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $in   = json_decode(readBody(64 * 1024), true) ?: [];
    $base = rtrim(trim($in['baseUrl'] ?? ''), '/');
    $key  = trim($in['apiKey'] ?? '');
    if (!isSafeHttpsUrl($base) || !$key) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'URL Base (https://) dan API Key wajib diisi.']);
        exit;
    }
    $ch = curl_init($base . '/models');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_SSL_VERIFYPEER  => true,
        CURLOPT_SSL_VERIFYHOST  => 2,
        CURLOPT_HTTPHEADER      => ['Authorization: Bearer ' . $key],
        CURLOPT_TIMEOUT         => 15
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err) {
        http_response_code(502);
        echo json_encode(['ok' => false, 'error' => 'Gagal menghubungi provider AI.']);
        exit;
    }
    $data   = json_decode($raw, true);
    $list   = $data['data'] ?? ($data['models'] ?? []);
    $models = [];
    foreach ($list as $item) {
        $id = is_string($item) ? $item : ($item['id'] ?? ($item['name'] ?? ''));
        if ($id && strlen($id) <= 128) $models[] = $id;
    }
    http_response_code($code ?: 200);
    echo json_encode(['ok' => ($code >= 200 && $code < 300 && !empty($models)), 'models' => $models]);
    exit;
}

// ── Health check ──
if (isset($_GET['health'])) {
    date_default_timezone_set('Asia/Jakarta');
    echo json_encode(['ok' => true, 'mode' => 'php-hosting', 'timeWib' => date('Y-m-d H:i')]);
    exit;
}

// ── GET state ──
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($stateFile)) {
        header('Content-Type: application/json; charset=utf-8');
        readfile($stateFile);
    } else {
        echo '{}';
    }
    exit;
}

// ── POST state (simpan) ──
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw     = readBody(15 * 1024 * 1024);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'JSON tidak valid']);
        exit;
    }
    // Hapus field sensitif agar tidak disimpan di server
    unset($decoded['users']);           // Password user TIDAK boleh di server
    $decoded['updatedAt'] = round(microtime(true) * 1000);
    // Atomik write dengan temp file
    $tmp = $stateFile . '.tmp.' . getmypid();
    if (file_put_contents($tmp, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) !== false) {
        rename($tmp, $stateFile);
    } else {
        @unlink($tmp);
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Gagal menyimpan state.']);
        exit;
    }
    echo json_encode(['ok' => true, 'updatedAt' => $decoded['updatedAt']]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method tidak diizinkan.']);
