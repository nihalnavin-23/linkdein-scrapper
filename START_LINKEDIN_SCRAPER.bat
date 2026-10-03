@echo off
title LinkedIn Lead & Talent Scraper Pro - Server
color 0B
cls
echo =====================================================================
echo       LINKEDIN LEAD ^& TALENT SCRAPER PRO (PORT 8525)
echo =====================================================================
echo.
echo [*] Initializing LinkedIn Lead Scraper Environment...
echo [*] Target URL: http://localhost:8525
echo.

:: Open default browser after 2 seconds in parallel
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8525"

:: Run local python server
python server.py

pause
