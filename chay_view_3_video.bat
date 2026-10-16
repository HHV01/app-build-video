@echo off
chcp 65001 >nul
title HE THONG CAY VIEW 10 BROWSERS - 3 VIDEOS
echo =======================================================================
echo          HE THONG CAY VIEW TU DONG 10 TRINH DUYET - 3 VIDEOS
echo =======================================================================
echo  - Video 1: Cai bay quyen luc trong lich su nuoc Duc? (19:43) [Moi]
echo  - Video 2: Toi Mat 6 Nam Moi Thay Tien Bat Dau "De Ra Tien" (8:41)
echo  - Video 3: MILO - Vi sao phat mien phi ma ca the he van nho? (9:20)
echo  - Che do: Khong thu nho man hinh, giao dien rieng biet tung cua so
echo  - Khoi dong: So le lech pha 25-45s, khong mo o at cung 1 luc
echo  - Tu dong xoay Wi-Fi doi IP: MinhLaConMeoDay ^<---^> VNTT-RD (30 phut)
echo =======================================================================
cd /d "%~dp0"
python tools\launch_gui_streamers.py
pause
