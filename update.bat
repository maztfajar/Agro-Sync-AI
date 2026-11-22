@echo off
REM ==============================================================================
REM AgroSync AI — Skrip Pembaruan Otomatis untuk Windows (Multi-PC Sync)
REM Pengembang: Fajar Wahyudi, S.Psi (Kapanewon Pengasih)
REM ==============================================================================
title AgroSync AI - Update dari GitHub
echo ===================================================
echo   AgroSync AI - Mengambil Pembaruan dari GitHub
echo ===================================================
echo.

cd /d "%~dp0"

REM 1. Jalankan git pull dari origin main
echo [*] Menjalankan git pull origin main...
git pull origin main

REM 2. Pastikan file index.html tersinkron
if exist "hosting-php\index.html" (
    if exist "nodejs-server\public\index.html" (
        copy /Y "hosting-php\index.html" "nodejs-server\public\index.html" >nul
        echo [OK] index.html tersinkron ke nodejs-server/public.
    )
)

echo.
echo ===================================================
echo   Pembaruan selesai! Versi komit terakhir:
git log -1 --pretty=format:"  Commit: %%h - %%s (%%cr)"
echo.
echo ===================================================
pause
