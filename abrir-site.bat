@echo off
title Turk Fitness - Preview do site
cd /d "%~dp0"
echo.
echo Abrindo o site Turk Fitness...
echo (esta janela precisa ficar aberta enquanto voce navega no site)
echo.
node preview-site.js
pause
