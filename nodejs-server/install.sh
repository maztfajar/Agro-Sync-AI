#!/usr/bin/env bash
set -e
echo "=== Instalasi Otomatis AgroSync AI (Linux + Cloudflare Tunnel Ready) ==="
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js belum terpasang. Menginstall Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "[✓] Node.js terdeteksi: $(node -v)"

mkdir -p /opt/agrosync/public /opt/agrosync/data
cp -f server.js /opt/agrosync/server.js
cp -f public/index.html /opt/agrosync/public/index.html
cp -f agrosync.service /etc/systemd/system/agrosync.service

systemctl daemon-reload
systemctl enable --now agrosync
echo ""
echo "[✓] AgroSync AI aktif di port 3080!"
echo "    Cek status : sudo systemctl status agrosync"
echo "    Uji lokal  : curl http://localhost:3080/api/health"
echo "    Cloudflare : Arahkan Public Hostname Tunnel -> HTTP -> localhost:3080"
