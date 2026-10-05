@echo off
chcp 65001 >nul
title HỆ THỐNG CÀY VIEW YOUTUBE - MÀN HÌNH 2
cd /d "%~dp0"

echo ======================================================================
echo 🎬 KHỞI ĐỘNG HỆ THỐNG CÀY VIEW THẬT (HIỂN THỊ MÀN HÌNH 2)
echo ======================================================================
echo.
echo Đang mở 4 cửa sổ Chrome thật trên Màn hình 2...
echo Màn hình 1 của bạn hoàn toàn tự do để làm việc!
echo.
python tools\launch_gui_streamers.py
pause
