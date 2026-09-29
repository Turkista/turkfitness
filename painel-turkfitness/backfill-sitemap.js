// Regenera sitemap.xml a partir dos dados reais em disco (produtos e
// posts publicados), replicando exatamente a mesma lógica de
// atualizarSitemap() em server.js — útil depois de rodar os scripts de
// backfill fora do servidor (eles não passam pelo Express, então não
// disparam a atualização automática do sitemap).
//
// Rodar uma vez, de dentro de painel-turkfitness/:
//   node backfill-sitemap.js
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ_SITE = path.join(__dirname, '..');
const CAMINHO_INDICE_PRODUTOS = path.join(RAIZ_SITE, 'src', 'content', 'produtos', 'index.json');
const CAMINHO_BLOG_INDICE = path.join(RAIZ_SITE, 'src', 'content', 'blog', 'index.json');
const CAMINHO_SITEMAP = path.join(RAIZ_SITE, 'sitemap.xml');
const URL_BASE = 'https://www.turkfitness.com.br';

const produtos = JSON.parse(fs.readFileSync(CAMINHO_INDICE_PRODUTOS, 'utf8'));
const posts = JSON.parse(fs.readFileSync(CAMINHO_BLOG_INDICE, 'utf8'));

const produtosPublicados = produtos.filter((p) => p.status === 'publicado');
const postsPublicados = posts.filter((p) => p.status === 'publicado');

const paginasFixas = [
  '/', '/catalogo.html', '/sobre-a-marca.html', '/contato.html', '/blog.html',
  '/como-cuidar-da-peca.html', '/faq.html', '/rastreie-seu-pedido.html',
  '/politica-de-envio-e-prazo-de-entrega.html', '/politica-de-troca-e-reembolso.html',
  '/politica-de-privacidade.html',
];

const urls = [
  ...paginasFixas.map((p) => `  <url><loc>${URL_BASE}${p}</loc></url>`),
  ...produtosPublicados.map((p) => `  <url><loc>${URL_BASE}/produto/${p.slug}.html</loc></url>`),
  ...postsPublicados.map((p) => `  <url><loc>${URL_BASE}/blog/${p.slug}.html</loc></url>`),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.writeFileSync(CAMINHO_SITEMAP, xml, 'utf8');

console.log(`✔ sitemap.xml regenerado: ${paginasFixas.length} páginas fixas, ${produtosPublicados.length} produtos, ${postsPublicados.length} posts.`);
