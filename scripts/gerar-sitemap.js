#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://www.turkfitness.com.br';
const OUTPUT = path.join(ROOT, 'sitemap.xml');
const PRODUCT_INDEX = path.join(ROOT, 'src', 'content', 'produtos', 'index.json');
const BLOG_INDEX = path.join(ROOT, 'src', 'content', 'blog', 'index.json');
const STATIC_PAGES = [
  '/', '/catalogo.html', '/sobre-a-marca.html', '/contato.html', '/blog.html',
  '/como-cuidar-da-peca.html', '/faq.html', '/rastreie-seu-pedido.html',
  '/politica-de-envio-e-prazo-de-entrega.html', '/politica-de-troca-e-reembolso.html',
  '/politica-de-privacidade.html',
];
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  return result;
}
function getCanonical(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical')) return attrs.href || '';
  }
  return '';
}
function hasNoindex(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.name || '').toLowerCase() === 'robots' && (attrs.content || '').toLowerCase().split(/[,\s]+/).includes('noindex')) return true;
  }
  return false;
}
function normalizedDate(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return '';
  const date = new Date(match[1] + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[1] ? '' : match[1];
}
function makeEntry(route, date, options = {}) {
  const required = options.required === true;
  const filePath = route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, route.slice(1));
  if (!fs.existsSync(filePath)) {
    if (required) throw new Error('URL publicada sem arquivo HTML: ' + route);
    return null;
  }
  const url = BASE_URL + route;
  const html = fs.readFileSync(filePath, 'utf8');
  const canonical = getCanonical(html);
  if (hasNoindex(html)) {
    if (required) throw new Error('Conteúdo publicado marcado como noindex: ' + url);
    return null;
  }
  if (canonical !== url) {
    if (required) throw new Error('Canonical ausente ou divergente em ' + route + ': esperado ' + url + ', encontrado ' + (canonical || '(ausente)'));
    return null;
  }
  const lastmod = normalizedDate(date);
  return '  <url>\n    <loc>' + escapeXml(url) + '</loc>' + (lastmod ? '\n    <lastmod>' + lastmod + '</lastmod>' : '') + '\n  </url>';
}
function buildSitemap() {
  const entries = [];
  const seen = new Set();
  function add(route, date, options) {
    const entry = makeEntry(route, date, options);
    if (!entry) return;
    const match = entry.match(/<loc>(.*?)<\/loc>/);
    const url = match ? match[1] : '';
    if (seen.has(url)) throw new Error('URL duplicada no sitemap: ' + url);
    seen.add(url);
    entries.push(entry);
  }
  for (const route of STATIC_PAGES) add(route, null, { required: false });
  const products = readJson(PRODUCT_INDEX);
  if (!Array.isArray(products)) throw new Error('O índice de produtos precisa ser um array.');
  for (const product of products) {
    if (product.status !== 'publicado') continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug || '')) throw new Error('Slug de produto inválido: ' + (product.slug || product.id || '(sem slug)'));
    add('/produto/' + product.slug + '.html', product.dataAtualizacao || product.dataCriacao, { required: true });
  }
  const posts = readJson(BLOG_INDEX);
  if (!Array.isArray(posts)) throw new Error('O índice do blog precisa ser um array.');
  for (const post of posts) {
    if (post.status !== 'publicado') continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug || '')) throw new Error('Slug de artigo inválido: ' + (post.slug || post.id || '(sem slug)'));
    add('/blog/' + post.slug + '.html', post.dataAtualizacao || post.dataPublicacao || post.dataCriacao, { required: true });
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.join('\n') + '\n</urlset>\n';
}
function main() {
  const generated = buildSitemap();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
    if (current !== generated) {
      console.error('✘ sitemap.xml está desatualizado. Execute: npm run sitemap:generate');
      process.exitCode = 1;
      return;
    }
    console.log('✔ sitemap.xml está sincronizado com as páginas canônicas e os conteúdos publicados.');
    return;
  }
  fs.writeFileSync(OUTPUT, generated, 'utf8');
  console.log('✔ sitemap.xml gerado com ' + [...generated.matchAll(/<loc>/g)].length + ' URLs canônicas e indexáveis.');
}
if (require.main === module) main();
module.exports = { buildSitemap, getCanonical, hasNoindex, normalizedDate };
