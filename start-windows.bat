@echo off
cd /d "%~dp0"
echo Dang mo AI Travel Companion tai http://localhost:8765/app.html
echo (De tat server, dong cua so nay)
call :KillPort 8901
call :KillPort 8900
call :KillPort 8899
call :KillPort 8765
echo Starting Claude Server(port 8901)...
start /b cmd /c "cd /d ""%~dp0claude-server"" && npm start"
echo Starting Auth Server(port 8900)...
start /b cmd /c "cd /d ""%~dp0auth-server"" && npm start"
echo Starting RAG Server(port 8899) ...
start /b cmd /c "cd /d ""%~dp0rag-server"" && npm start"
start "" "http://localhost:8765/app.html"
echo Starting local web server...
start /b python -m http.server 8765
pause

:KillPort
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":%~1 "') do taskkill /F /PID %%P >nul 2>nul
exit /b
