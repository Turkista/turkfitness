// Gera (ou regenera) a página estática /blog/<slug>.html de TODOS os posts
// publicados já existentes em src/content/blog/index.json — parte da
// migração de blog-post.html?slug=... para páginas estáticas por artigo.
//
// Rodar uma vez, de dentro de painel-turkfitness/:
//   node backfill-blog.js
'use strict';

const fs = require('fs');
const path = require('path');
const { montarHtmlBlog } = require('./seo-blog');

const RAIZ_SITE = path.join(__dirname, '..');
const CAMINHO_BLOG_INDICE = path.join(RAIZ_SITE, 'src', 'content', 'blog', 'index.json');
const DIR_BLOG_PAGINAS = path.join(RAIZ_SITE, 'blog');
const CAMINHO_TEMPLATE = path.join(DIR_BLOG_PAGINAS, '_template.html');
const URL_BASE = 'https://www.turkfitness.com.br';

if (!fs.existsSync(CAMINHO_TEMPLATE)) {
  console.error('✘ Não encontrei blog/_template.html — rode este script de dentro de painel-turkfitness/.');
  process.exit(1);
}
if (!fs.existsSync(CAMINHO_BLOG_INDICE)) {
  console.error('✘ Não encontrei src/content/blog/index.json.');
  process.exit(1);
}

fs.mkdirSync(DIR_BLOG_PAGINAS, { recursive: true });
const template = fs.readFileSync(CAMINHO_TEMPLATE, 'utf8');
const posts = JSON.parse(fs.readFileSync(CAMINHO_BLOG_INDICE, 'utf8'));

let ok = 0;
const falhas = [];

for (const post of posts) {
  try {
    const html = montarHtmlBlog(template, post.slug, post, URL_BASE);
    fs.writeFileSync(path.join(DIR_BLOG_PAGINAS, post.slug + '.html'), html, 'utf8');
    ok++;
  } catch (erro) {
    falhas.push({ slug: post.slug, erro: erro.message });
  }
}

console.log(`✔ ${ok} página(s) de post regenerada(s) com SEO.`);
if (falhas.length) {
  console.log(`✘ ${falhas.length} falharam:`);
  falhas.forEach((f) => console.log(`  - ${f.slug}: ${f.erro}`));
}
