# Panduan Instalasi AgroSync AI di Server Linux + Cloudflare Tunnel

Dikembangkan oleh **Fajar Wahyudi, S.Psi** (Kapanewon Pengasih).
Paket ini **tanpa dependensi eksternal (`npm install` tidak diperlukan)** — cukup Node.js 18+.

## 1. Install Node.js (Ubuntu / Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

## 2. Ekstrak & Jalankan AgroSync AI di Port 3080
```bash
sudo mkdir -p /opt/agrosync
sudo unzip agrosync_linux_server.zip -d /opt/agrosync
cd /opt/agrosync
PORT=3080 node server.js
```
Uji lokal: buka `http://IP-SERVER:3080` atau `curl http://localhost:3080/api/health`.

## 3. Jalankan Otomatis 24/7 dengan Systemd
```bash
sudo cp /opt/agrosync/agrosync.service /etc/systemd/system/agrosync.service
sudo systemctl daemon-reload
sudo systemctl enable --now agrosync
sudo systemctl status agrosync
```

## 4. Hubungkan ke Cloudflare Tunnel (`cloudflared`)
Di dashboard **Cloudflare Zero Trust → Networks → Tunnels**:
- Buat Public Hostname (misal: `agrosync.domainanda.com`)
- **Service Type**: `HTTP`
- **URL**: `localhost:3080`

Begitu dibuka melalui `https://agrosync.domainanda.com`:
1. Aplikasi web otomatis mendeteksi origin server dan menyinkronkan data ke `data/state.json`.
2. Masuk sebagai **Admin** (`admin` / `admin123`), buka tab **Konfigurasi**:
   - Isi **API Key & URL Base AI** (mode hemat token terjadwal).
   - Isi **Telegram Bot Token** dan aktifkan pengingat.
   - Tambahkan **Daftar Pengguna** beserta **Telegram Chat ID** masing-masing.
3. Server otomatis mengirim pengingat jadwal sesuai jam WIB ke semua pengguna terdaftar, lengkap dengan tombol **✅ Tandai Selesai** (atau pengguna bisa membalas pesan dengan kata `"selesai"` / perintah `/jadwal`).
4. Begitu tugas ditandai selesai lewat Telegram, status & nama pelaksana otomatis tersinkron ke tampilan web semua pengguna!
