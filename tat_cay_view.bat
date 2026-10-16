@echo off
chcp 65001 >nul
title DUNG HE THONG CAY VIEW
cd /d "%~dp0"
python tools\stop_streamers.py
pause
