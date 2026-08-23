@echo off
cd /d "%~dp0painel-turkfitness"
if not exist node_modules (
  echo Instalando dependencias do painel pela primeira vez...
  call npm install
)
start http://localhost:3000
call npm start
