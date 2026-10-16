@echo off
chcp 65001 >nul
echo ===================================================
echo     DANG KHOI DONG GOOGLE FLOW AUTO-GENERATOR
echo ===================================================
python "%~dp0tools\auto_generate_flow.py" %*
pause
