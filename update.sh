#!/usr/bin/env bash
# ==============================================================================
# AgroSync AI — Skrip Pembaruan Otomatis (Multi-PC Sync Script)
# Pengembang: Fajar Wahyudi, S.Psi (Kapanewon Pengasih)
# ==============================================================================
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌱 AgroSync AI — Pembaruan Proyek dari GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Pastikan berada di direktori root proyek
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 2. Cek apakah ada perubahan lokal yang belum dikomit
HAS_LOCAL_CHANGES=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  HAS_LOCAL_CHANGES=true
  echo "[!] Terdeteksi perubahan lokal yang belum dikomit."
  echo "    Menyimpan sementara ke Git Stash agar tidak bentrok..."
  git stash push -m "Auto-stash sebelum git pull ($(date '+%Y-%m-%d %H:%M:%S'))"
fi

# 3. Ambil perubahan terbaru dari remote repository
echo "[→] Menjalankan git pull dari origin/main..."
git pull --rebase origin main || {
  echo ""
  echo "[X] Gagal melakukan git pull. Mencoba git pull standar..."
  git pull origin main
}

# 4. Kembalikan perubahan lokal jika sebelumnya ada yang di-stash
if [ "$HAS_LOCAL_CHANGES" = true ]; then
  echo "[✓] Mengembalikan perubahan lokal yang di-stash..."
  git stash pop || {
    echo "[!] Catatan: Ada berkas lokal yang bentrok. Silakan periksa dengan 'git status'."
  }
fi

# 5. Sinkronkan berkas index.html antar folder (hosting-php <-> nodejs-server/public)
if [ -f "hosting-php/index.html" ] && [ -f "nodejs-server/public/index.html" ]; then
  # Salin dari yang paling baru diubah
  if [ "hosting-php/index.html" -nt "nodejs-server/public/index.html" ]; then
    cp -f "hosting-php/index.html" "nodejs-server/public/index.html"
    echo "[✓] Berkas index.html disinkronkan (hosting-php -> nodejs-server/public)."
  elif [ "nodejs-server/public/index.html" -nt "hosting-php/index.html" ]; then
    cp -f "nodejs-server/public/index.html" "hosting-php/index.html"
    echo "[✓] Berkas index.html disinkronkan (nodejs-server/public -> hosting-php)."
  fi
fi

# 6. Restart service jika berjalan sebagai systemd service di server ini
if systemctl is-active --quiet agrosync 2>/dev/null; then
  echo "[✓] Merestart layanan systemd agrosync..."
  sudo systemctl restart agrosync || echo "[!] Tidak ada akses sudo untuk restart agrosync (abaikan jika di PC biasa)."
fi

# 7. Tampilkan status komit terakhir
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Pembaruan selesai! Versi saat ini:"
git log -1 --pretty=format:"  Commit: %h - %s (%cr oleh %an)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
