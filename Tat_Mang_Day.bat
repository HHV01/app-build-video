@echo off
chcp 65001 >nul

:: Kiểm tra quyền Admin, nếu chưa có thì tự động gọi cửa sổ xin quyền UAC
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Đang yêu cầu quyền Quản trị viên (Administrator)...
    powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -Command \"Disable-NetAdapter -Name Ethernet -Confirm:$false; Write-Host `\"[THÀNH CÔNG] Đã tắt mạng dây Ethernet! Chuyển sang 100%% Wi-Fi.`\" -ForegroundColor Green; Start-Sleep -Seconds 3\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   ĐANG NGẮT KẾT NỐI MẠNG DÂY ETHERNET...
echo ========================================================
powershell -NoProfile -Command "Disable-NetAdapter -Name 'Ethernet' -Confirm:$false"

if %errorlevel% equ 0 (
    echo [THÀNH CÔNG] Đã ngắt mạng dây! Máy tính đã chuyển sang 100%% Wi-Fi.
) else (
    echo [LỖI] Không thể tắt card mạng dây.
)
echo.
timeout /t 3
