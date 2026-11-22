#!/usr/bin/env bash
set -e
echo "=== Instalasi AgroSync AI dengan Docker (Auto-Start Saat PC Menyala) ==="
if ! command -v docker >/dev/null 2>&1; then
  echo "[!] Docker belum terpasang. Silakan install Docker terlebih dahulu:"
  echo "    curl -fsSL https://get.docker.com | sudo sh"
  echo "    sudo systemctl enable --now docker"
  exit 1
fi

# Pastikan Docker daemon otomatis hidup saat PC menyala
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl enable --now docker >/dev/null 2>&1 || true
fi

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
else
  docker-compose up -d --build
fi

echo ""
echo "[✓] AgroSync AI aktif di Docker (port 3080) & otomatis menyala saat PC restart!"
echo "    Buka browser : http://localhost:3080"
echo "    Cek status   : docker ps"
echo "    Lihat log    : docker logs -f agrosync-ai"
echo "    Cloudflare   : Arahkan Public Hostname Tunnel -> HTTP -> localhost:3080"
