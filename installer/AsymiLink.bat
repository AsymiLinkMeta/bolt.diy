@echo off
title AsymiLink AI
color 0B
echo.
echo  =====================================================
echo    AsymiLink AI - Local AI Coding Studio
echo  =====================================================
echo.
echo  Starting server, please wait...
echo  The app will open in your browser automatically.
echo.
echo  To stop the server, close this window or press Ctrl+C
echo.

cd /d "%~dp0"

node launcher.js

echo.
echo  Server stopped. Press any key to exit.
pause >nul
