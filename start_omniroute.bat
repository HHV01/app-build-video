@echo off
chcp 65001 >nul
title OmniRoute AI Gateway Server
echo ========================================================
echo   KHỞI ĐỘNG OMNIROUTE AI GATEWAY (PORT 20128)
echo ========================================================
echo.
echo Đang chạy OmniRoute proxy server...
echo URL: http://localhost:20128/v1
echo Dashboard: http://localhost:20128/dashboard
echo.
npx omniroute
pause
