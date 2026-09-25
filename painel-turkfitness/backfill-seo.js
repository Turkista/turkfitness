// Regenera TODAS as fichas de produto já existentes (produto/<slug>.html)
// com o SEO novo: título, meta description, imagem de compartilhamento
// real e dados estruturados (JSON-LD). Não altera nenhum arquivo em
// src/content/produtos/*.json — só recria o HTML de cada ficha a partir
// do _template.html atualizado, usando os dados que já estavam lá.
//
// Rodar uma vez, de dentro de painel-turkfitness/:
//   node backfill-seo.js
'use strict';

const fs = require('fs');
const path = require('path');
const { montarHtmlProduto } = require('./seo-produto');

const RAIZ_SITE = path.join(__dirname, '..');
const DIR_PRODUTOS_JSON = path.join(RAIZ_SITE, 'src', 'content', 'produtos');
const DIR_PRODUTO_PAGINAS = path.join(RAIZ_SITE, 'produto');
const CAMINHO_TEMPLATE = path.join(DIR_PRODUTO_PAGINAS, '_template.html');
const URL_BASE = 'https://www.turkfitness.com.br';

if (!fs.existsSync(CAMINHO_TEMPLATE)) {
  console.error('✘ Não encontrei produto/_template.html — rode este script de dentro de painel-turkfitness/.');
  process.exit(1);
}

const template = fs.readFileSync(CAMINHO_TEMPLATE, 'utf8');
const arquivos = fs
  .readdirSync(DIR_PRODUTOS_JSON)
  .filter((f) => f.endsWith('.json') && f !== 'index.json');

let ok = 0;
const falhas = [];

for (const arquivo of arquivos) {
  try {
    const produto = JSON.parse(fs.readFileSync(path.join(DIR_PRODUTOS_JSON, arquivo), 'utf8'));
    const html = montarHtmlProduto(template, produto.slug, produto, URL_BASE);
    fs.writeFileSync(path.join(DIR_PRODUTO_PAGINAS, produto.slug + '.html'), html, 'utf8');
    ok++;
  } catch (erro) {
    falhas.push({ arquivo, erro: erro.message });
  }
}

console.log(`✔ ${ok} página(s) de produto regenerada(s) com SEO.`);
if (falhas.length) {
  console.log(`✘ ${falhas.length} falharam:`);
  falhas.forEach((f) => console.log(`  - ${f.arquivo}: ${f.erro}`));
}
