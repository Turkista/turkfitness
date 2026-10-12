'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { montarHtmlProduto } = require('./seo-produto');
const { montarHtmlBlog } = require('./seo-blog');

const RAIZ = path.resolve(__dirname, '..');
const URL_BASE = 'https://www.turkfitness.com.br';
const DIR_PRODUTOS = path.join(RAIZ, 'src', 'content', 'produtos');
const CAMINHO_INDICE_BLOG = path.join(RAIZ, 'src', 'content', 'blog', 'index.json');
const DIR_PAGINAS_PRODUTO = path.join(RAIZ, 'produto');
const DIR_PAGINAS_BLOG = path.join(RAIZ, 'blog');
const TEMPLATE_PRODUTO = fs.readFileSync(path.join(DIR_PAGINAS_PRODUTO, '_template.html'), 'utf8');
const TEMPLATE_BLOG = fs.readFileSync(path.join(DIR_PAGINAS_BLOG, '_template.html'), 'utf8');

function salvarPagina(diretorio, slug, html) {
  const destino = path.join(diretorio, slug + '.html');
  fs.writeFileSync(destino, html, 'utf8');
}

const arquivosProduto = fs.readdirSync(DIR_PRODUTOS)
  .filter((arquivo) => arquivo.endsWith('.json') && arquivo !== 'index.json');

let produtosAtualizados = 0;
for (const arquivo of arquivosProduto) {
  const produto = JSON.parse(fs.readFileSync(path.join(DIR_PRODUTOS, arquivo), 'utf8'));
  if (!produto.slug) throw new Error('Produto sem slug: ' + arquivo);
  salvarPagina(DIR_PAGINAS_PRODUTO, produto.slug, montarHtmlProduto(TEMPLATE_PRODUTO, produto.slug, produto, URL_BASE));
  produtosAtualizados += 1;
}

const posts = JSON.parse(fs.readFileSync(CAMINHO_INDICE_BLOG, 'utf8'));
if (!Array.isArray(posts)) throw new Error('Índice do blog não é uma lista.');
let artigosAtualizados = 0;
for (const post of posts.filter((item) => item.status === 'publicado')) {
  if (!post.slug) throw new Error('Artigo publicado sem slug.');
  salvarPagina(DIR_PAGINAS_BLOG, post.slug, montarHtmlBlog(TEMPLATE_BLOG, post.slug, post, URL_BASE));
  artigosAtualizados += 1;
}

console.log('Páginas estáticas regeneradas: ' + produtosAtualizados + ' produtos e ' + artigosAtualizados + ' artigos.');
