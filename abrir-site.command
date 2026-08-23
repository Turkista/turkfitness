#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "Abrindo o site Turk Fitness..."
echo "(esta janela precisa ficar aberta enquanto você navega no site)"
echo ""
node preview-site.js
read -p "Pressione Enter para fechar..."
