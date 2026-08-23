#!/bin/bash
cd "$(dirname "$0")/painel-turkfitness"
if [ ! -d node_modules ]; then
  echo "Instalando dependências do painel pela primeira vez..."
  npm install
fi
sleep 1 && open http://localhost:3000 &
npm start
