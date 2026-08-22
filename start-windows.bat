@echo off
cd /d "%~dp0"
echo Dang mo AI Travel Companion tai http://localhost:8765/app.html
echo (De tat server, dong cua so nay)
start "" "http://localhost:8765/app.html"
python -m http.server 8765
pause
