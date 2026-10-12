'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { construirSeoProduto } = require('./seo-produto');
const { construirSeoBlog } = require('./seo-blog');

const raiz = path.resolve(__dirname, '..');
const base = 'https://www.turkfitness.com.br';
const lerJson = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const produtos = lerJson('src/content/produtos/index.json').filter((p) => p.status === 'publicado');
const posts = lerJson('src/content/blog/index.json').filter((p) => p.status === 'publicado');
const sitemap = fs.readFileSync(path.join(raiz, 'sitemap.xml'), 'utf8');

test('a página inicial usa a raiz como URL canônica e Open Graph', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.turkfitness\.com\.br\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/www\.turkfitness\.com\.br\/">/);
  assert.doesNotMatch(html, /rel="canonical" href="https:\/\/www\.turkfitness\.com\.br\/index\.html"/);
});

test('cada produto publicado gera SKU único no JSON-LD', () => {
  const skus = produtos.map((produto) => {
    const seo = construirSeoProduto(produto, base);
    const jsonLd = JSON.parse(seo.jsonLdTag);
    assert.equal(jsonLd['@type'], 'Product');
    assert.equal(jsonLd.sku, produto.slug);
    const breadcrumb = JSON.parse(seo.breadcrumbJsonLdTag);
    assert.equal(breadcrumb['@type'], 'BreadcrumbList');
    assert.equal(breadcrumb.itemListElement.length, 3);
    assert.equal(breadcrumb.itemListElement[2].item, `${base}/produto/${produto.slug}.html`);
    return jsonLd.sku;
  });
  assert.equal(new Set(skus).size, skus.length, 'SKU duplicado entre produtos publicados');
});

test('todos os produtos publicados geram título e meta description dentro do limite', () => {
  for (const produto of produtos) {
    const seo = construirSeoProduto(produto, base);
    assert.ok(seo.titulo.trim().length > 0, `Título ausente: ${produto.slug}`);
    assert.ok(seo.descricao.length <= 160, `Descrição longa demais: ${produto.slug}`);
  }
});

test('descrições longas de produtos e artigos não terminam com palavra cortada', () => {
  const textoLongo = 'Legging confortável e tecido respirável para treinos '.repeat(8);
  const produto = construirSeoProduto({
    nome: 'Produto de teste',
    slug: 'produto-de-teste',
    descricaoCurta: textoLongo,
    descricaoCompleta: textoLongo,
    imagens: [],
    status: 'publicado',
  }, base);
  const post = construirSeoBlog({
    titulo: 'Artigo de teste',
    slug: 'artigo-de-teste',
    resumo: textoLongo,
  }, base);

  for (const descricao of [produto.descricao, post.descricao]) {
    assert.ok(descricao.length <= 160);
    assert.match(descricao, /(?:legging|confortável|e|tecido|respirável|para|treinos)\.\.\.$/i);
  }
});

test('as meta descriptions geradas para artigos não excedem 160 caracteres', () => {
  for (const post of posts) {
    const seo = construirSeoBlog(post, base);
    assert.ok(seo.descricao.length <= 160, `Descrição longa demais: ${post.slug}`);
    assert.ok(seo.titulo.trim().length > 0, `Título ausente: ${post.slug}`);
    assert.equal(JSON.parse(seo.jsonLdTag)['@type'], 'BlogPosting');
    const breadcrumb = JSON.parse(seo.breadcrumbJsonLdTag);
    assert.equal(breadcrumb['@type'], 'BreadcrumbList');
    assert.equal(breadcrumb.itemListElement.length, 3);
    assert.equal(breadcrumb.itemListElement[2].item, `${base}/blog/${post.slug}.html`);
  }
});

test('o sitemap inclui todas as páginas de produto e artigos publicados', () => {
  const urls = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
  for (const produto of produtos) {
    assert.ok(urls.has(`${base}/produto/${produto.slug}.html`), `Produto ausente do sitemap: ${produto.slug}`);
  }
  for (const post of posts) {
    assert.ok(urls.has(`${base}/blog/${post.slug}.html`), `Artigo ausente do sitemap: ${post.slug}`);
  }
  assert.ok(urls.has(`${base}/`), 'Página inicial ausente do sitemap');
  assert.ok(urls.has(`${base}/catalogo.html`), 'Catálogo ausente do sitemap');
});
