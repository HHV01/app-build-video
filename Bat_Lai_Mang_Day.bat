@echo off
chcp 65001 >nul

:: Kiểm tra quyền Admin, nếu chưa có thì tự động gọi cửa sổ xin quyền UAC
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Đang yêu cầu quyền Quản trị viên (Administrator)...
    powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -Command \"Enable-NetAdapter -Name Ethernet -Confirm:$false; Write-Host `\"[THÀNH CÔNG] Đã bật lại mạng dây Ethernet!`\" -ForegroundColor Green; Start-Sleep -Seconds 3\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   ĐANG BẬT LẠI KẾT NỐI MẠNG DÂY ETHERNET...
echo ========================================================
powershell -NoProfile -Command "Enable-NetAdapter -Name 'Ethernet' -Confirm:$false"

if %errorlevel% equ 0 (
    echo [THÀNH CÔNG] Đã bật lại mạng dây Ethernet!
) else (
    echo [LỖI] Không thể bật card mạng dây.
)
echo.
timeout /t 3
