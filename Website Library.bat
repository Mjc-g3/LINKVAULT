@echo off
cd /d "E:\Powerful Websites Local\website-library"

start /min cmd /c "npm run dev"

timeout /t 2 /nobreak >nul

start "" "http://localhost:5173"

exit