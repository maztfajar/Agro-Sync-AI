# Panduan Instalasi AgroSync AI (PC/Server Lokal Docker, Linux Systemd & Web Hosting)

Pengembang: **Fajar Wahyudi, S.Psi** (Pegawai Kapanewon Pengasih)

Paket ini siap dipasang di **3 mode berbeda** sesuai kebutuhan Anda:

---

## OPSI 1 — Install di PC / Server Lokal dengan DOCKER (Otomatis Hidup Saat PC Menyala)
Bisa dipakai di **Linux, Windows (Docker Desktop), maupun macOS**. Data tersimpan permanen di folder `./data`.

```bash
cd nodejs-server
bash install_docker.sh
```
Atau jalankan langsung:
```bash
cd nodejs-server
docker compose up -d --build
```
- Karena memakai `restart: unless-stopped`, container `agrosync-ai` **otomatis menyala sendiri setiap kali PC/server hidup**.
- Buka di browser: `http://localhost:3080` (cek kesehatan: `http://localhost:3080/api/health`).
- **Cloudflare Tunnel**: Arahkan Public Hostname ke `HTTP -> localhost:3080` (atau aktifkan layanan `cloudflared` di `docker-compose.yml` dengan menempelkan Token Tunnel Anda).

---

## OPSI 2 — Install di PC / Server Linux Lokal TANPA Docker (Systemd Auto-Start)
Otomatis berjalan di latar belakang 24/7 dan otomatis hidup saat PC Linux menyala:

```bash
cd nodejs-server
sudo bash install.sh
```
- Cek status: `sudo systemctl status agrosync`
- Uji lokal: `curl http://localhost:3080/api/health`
- **Cloudflare Tunnel**: Arahkan Public Hostname ke `HTTP -> localhost:3080`.

---

## OPSI 3 — Web Hosting (cPanel Node.js atau Shared Hosting PHP Biasa)
1. **cPanel Node.js ("Setup Node.js App")**: Unggah isi folder `nodejs-server/`, pilih Node.js 18/20/22, Startup File `server.js`, klik **Start App** (tidak perlu `npm install`).
2. **Shared Hosting PHP Biasa (tanpa Node.js)**:
   - Unggah seluruh isi folder `hosting-php/` ke `public_html/`.
   - Tambahkan Cron Job 1 menit di cPanel:
     `/usr/local/bin/php /home/USER_CPANEL/public_html/cron_reminder.php >/dev/null 2>&1`
   - Daftarkan Webhook Telegram 1 kali di browser:
     `https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://domainanda.com/telegram_webhook.php`
