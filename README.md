# 🌱 AgroSync AI v3.0

> **Sistem Manajemen Budidaya Terpadu Sirkular, Vision AI Hemat Token & Bot Telegram 2-Arah**  
> Didesain khusus untuk efisiensi instansi, perkantoran, dan kelompok tani modern.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777bb4.svg)](https://www.php.net/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Zero Dependency](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Built--in)-success.svg)]()
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

---

## 📌 Sekilas Program

**AgroSync AI** adalah platform pemantauan dan otomasi budidaya cerdas (*Smart Farming*) berbasis web dan bot Telegram yang menerapkan prinsip **Ekosistem Sirkular Berkelanjutan (Zero-Waste)**:
1. **Perikanan (Kolam Bis Sumur Lele)**: Penghasil protein dan limbah air kolam kaya nitrogen/nutrisi.
2. **Pertanian (Kebun Sayur Pekarangan)**: Menyerap air kurasan kolam lele dan pupuk kasgot (organik).
3. **Biokonversi (Maggot BSF)**: Mengolah sampah sisa makanan/dapur kantor menjadi pakan segar berprotein tinggi untuk ikan, sekaligus menghasilkan pupuk bekas maggot (*kasgot*).

Dikembangkan oleh **Fajar Wahyudi, S.Psi** (Pegawai Kapanewon Pengasih, Kabupaten Kulon Progo, D.I. Yogyakarta) sebagai solusi digitalisasi ketahanan pangan kantor dan masyarakat terpadu.

---

## ✨ Fitur Unggulan

### 1. 🤖 Vision AI Terjadwal (Hemat Token & Kuota)
- **Analisis Foto Multi-Komoditas**: Deteksi dini gejala penyakit ikan (bintik putih, menggantung), kondisi maggot (media becek/kering), dan hama tanaman langsung dari kamera atau galeri.
- **Kompresi Otomatis di Browser**: Foto dikompresi ke resolusi optimal (lebar maks. 480px) sebelum dikirim, menghemat hingga 85% konsumsi token API Vision.
- **Multi-Provider AI Ready**: Mendukung **OpenAI** (`gpt-4o-mini`), **Google Gemini** (`gemini-2.5-flash`), **OpenRouter**, **NVIDIA NIM**, dan **SumoPod**.
- **Offline Fallback Engine**: Sistem tetap dapat mendiagnosis dan menyusun jadwal menggunakan algoritma aturan lokal ketika koneksi offline atau kuota token habis.

### 2. 📲 Bot Telegram Interaktif 2-Arah
- **Analisis Foto Langsung di Chat**: Kirim foto kolam, daun sayur, atau maggot ke bot Telegram — AI akan otomatis mendiagnosis dan mencatatnya ke Web App secara real-time.
- **Tandai Selesai 1-Klik**: Notifikasi pengingat dilengkapi tombol inline `[✅ Tandai Selesai]`. Data pelaksana dan waktu pengerjaan otomatis tersinkron ke web.
- **Pengingat Presisi Tiap Menit**: Jadwal perawatan (pemberian pakan, pengurasan air, penaburan dolomit) otomatis terkirim tepat waktu ke grup atau akun staf.
- **Ekspor Laporan PDF Otomatis**: Ketik perintah `/laporan` di bot untuk menerima dokumen PDF rekapitulasi budidaya resmi langsung di Telegram.

### 3. 🏢 Sinkronisasi Kalender Kerja Kantor
- **Jadwal Khusus Hari Dinas**: Jadwal piket perawatan hanya aktif pada hari kerja kantor (Senin–Jumat pukul 07:30–16:00 WIB).
- **Hari Libur Nasional Indonesia (2025–2027)**: Otomatis mengenali akhir pekan dan tanggal merah nasional, namun evaluasi kecerdasan buatan tetap berjalan setiap hari.

### 4. 🔄 Sinkronisasi Real-Time Multi-Pengguna
- Sinkronisasi instan antar-perangkat via **WebSocket / REST Polling + BroadcastChannel**.
- Dukungan multi-role: **Admin** (kelola akun, API key, backup) dan **Staf/User** (catat perawatan dan panen).
- Sistem backup ganda: Backup lokal (*localStorage*) dan backup otomatis di server Linux.

---

## 🏛️ Arsitektur & Acuan Standar Budidaya

Aplikasi mengadopsi standar resmi budidaya:
- **SPO Budidaya Lele**: Standar KKP, IPB Digitani, dan UNBARI (panen 60–90 hari, pergantian air 10–20% dengan air endapan 24 jam, probiotik & dolomit berkala).
- **Biokonversi Maggot BSF**: Panduan PPID KKP & PIAT UGM (siklus larva 14–21 hari, kelembapan 60–70%, pemilahan pakan organik).
- **Pertanian Pekarangan**: Balai Penerapan Standar Instrumen Pertanian (BRMP) Banten & Kementan (penyiraman pagi/sore air kolam lele dan kasgot).

---

## 🚀 Panduan Instalasi & Deployment

AgroSync AI dirancang sangat fleksibel dan dapat dijalankan dalam **4 mode**:

### OPSI A — Docker (Rekomendasi untuk PC / Server Kantor)
Container otomatis menyala saat PC kantor dinyalakan:
```bash
cd nodejs-server
docker compose up -d --build
```
- Buka di browser: `http://localhost:3080`
- Cek status endpoint: `http://localhost:3080/api/health`

### OPSI B — Server Linux Standalone (Systemd Service 24/7)
Instalasi otomatis tanpa Docker di Ubuntu / Debian:
```bash
cd nodejs-server
sudo bash install.sh
```
- Kelola service: `sudo systemctl status agrosync`
- Hubungkan ke internet publik: Gunakan **Cloudflare Tunnel** (arahkan Public Hostname ke `HTTP -> localhost:3080`).

### OPSI C — Shared Hosting cPanel Biasa (PHP 8.0+)
Cocok untuk hosting web standar tanpa akses Node.js:
1. Unggah seluruh isi folder `hosting-php/` ke direktori `public_html/`.
2. Tambahkan **Cron Job** 1 menit di cPanel:
   ```bash
   * * * * * /usr/local/bin/php /home/USER_CPANEL/public_html/cron_reminder.php >/dev/null 2>&1
   ```
3. Daftarkan Webhook Telegram (cukup 1 kali di browser):
   ```
   https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://domainanda.com/telegram_webhook.php
   ```

### OPSI D — Standalone di Browser (Offline First)
Cukup buka file `hosting-php/index.html` (atau `nodejs-server/public/index.html`) langsung di browser Chrome, Edge, atau Safari. Semua data tersimpan aman di penyimpanan lokal browser.

---

## 🔄 Alur Kerja Multi-PC (Sinkronisasi Antar-Perangkat)

Jika proyek ini dikerjakan secara kolaboratif atau berpindah-pindah antar-PC (misalnya PC Kantor, Laptop, dan PC Rumah), ikuti alur kerja praktis berikut:

### 1. Pertama Kali Pasang di PC Baru
```bash
git clone https://github.com/maztfajar/Agro-Sync-AI.git
cd Agro-Sync-AI
```

### 2. Sebelum Mulai Bekerja (Tarik Pembaruan Terbaru)
Jalankan salah satu cara di bawah ini untuk mengambil kode terbaru yang dikerjakan dari PC lain:
- **Linux / macOS**:
  ```bash
  ./update.sh
  ```
- **Windows**:
  Cukup klik ganda (double-click) file `update.bat`, atau jalankan di Command Prompt:
  ```cmd
  update.bat
  ```
- **Atau manual via Git / Antigravity IDE**:
  ```bash
  git pull origin main
  ```
  *(Atau klik ikon panah melingkar / **Sync Changes** di panel Source Control `Ctrl + Shift + G`).*

> [!TIP]
> Skrip `update.sh` dan `update.bat` sudah dilengkapi fitur cerdas:
> - Menyimpan perubahan lokal sementara (*auto-stash*) jika ada pekerjaan yang belum sempat dikomit agar tidak bentrok.
> - Menyinkronkan file frontend `hosting-php/index.html` dan `nodejs-server/public/index.html` secara otomatis.
> - Menampilkan ringkasan komit dan pengembang yang terakhir kali memperbarui.

### 3. Setelah Selesai Bekerja di PC Tersebut (Kirim ke GitHub)
Kirim pembaruan agar bisa diambil saat Anda membuka PC lain:
```bash
git add .
git commit -m "Update fitur/perbaikan: penjelasan singkat"
git push origin main
```
*(Atau lakukan commit dan klik **Sync Changes** langsung di Antigravity IDE).*

---

## 🔒 Keamanan Sistem

- **Zero Credential Leakage**: Password pengguna di-hash dengan SHA-256 dan dilindungi di sisi client; tidak tersimpan terbuka di server publik.
- **Anti-SSRF Protection**: Backend proxy memvalidasi skema `https://` dan memblokir akses ke alamat IP internal (*private IP ranges*).
- **Content Security Policy (CSP)** & Header Proteksi: Dilengkapi `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, dan `Strict-Transport-Security`.
- **Brute-Force Lockout**: Sistem otomatis mengunci percobaan login selama 30 detik setelah 5 kali gagal.

---

## 📁 Struktur Direktori

```text
Agro-Sync-AI/
├── README.md                      # Dokumentasi utama repositori
├── README_DEPLOY_LENGKAP.md       # Panduan instalasi dan deployment teknis
├── update.sh                      # Skrip 1-klik tarik pembaruan (Linux / macOS)
├── update.bat                     # Skrip 1-klik tarik pembaruan (Windows)
├── hosting-php/                   # Paket rilis untuk shared hosting cPanel
│   ├── index.html                 # Frontend SPA lengkap (Tailwind, Chart.js, jsPDF)
│   ├── api.php                    # REST API proxy sinkronisasi, AI & Telegram
│   ├── cron_reminder.php          # Worker pengingat otomatis per menit
│   ├── telegram_webhook.php       # Penerima webhook 2-arah dari bot Telegram
│   ├── .htaccess                  # Konfigurasi rewrite engine dan security headers
│   └── data/                      # Direktori state JSON terlindungi
└── nodejs-server/                 # Paket server Node.js 24/7 (Zero-Dependency)
    ├── server.js                  # HTTP server, cron scheduler & Telegram bot engine
    ├── package.json               # Konfigurasi package Node.js
    ├── Dockerfile                 # Konfigurasi container Docker
    ├── docker-compose.yml         # Orkestrasi Docker Compose
    ├── agrosync.service           # Unit service Linux systemd
    ├── install.sh                 # Skrip instalasi otomatis Linux systemd
    ├── install_docker.sh          # Skrip instalasi otomatis Docker
    └── public/
        └── index.html             # Web app publik
```

---

## 👨‍💼 Kontributor & Pengembang

- **Fajar Wahyudi, S.Psi**  
  *Pegawai Kapanewon Pengasih, Kabupaten Kulon Progo, Daerah Istimewa Yogyakarta*  
  GitHub: [@maztfajar](https://github.com/maztfajar)

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi **MIT**. Bebas digunakan, dikembangkan, dan dimanfaatkan untuk instansi pemerintah, kelompok tani, maupun komersial dengan tetap mencantumkan atribusi pengembang.
