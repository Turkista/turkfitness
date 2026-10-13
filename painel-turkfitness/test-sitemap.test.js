'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSitemap } = require('../scripts/gerar-sitemap.js');
const ROOT = path.resolve(__dirname, '..');
test('sitemap.xml corresponde aos dados e às páginas canônicas publicadas', () => {
  const expected = buildSitemap();
  const actual = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.equal(actual, expected, 'Execute npm run sitemap:generate e atualize sitemap.xml.');
});
test('sitemap tem URLs únicas e não inclui modelos ou URLs de teste', () => {
  const xml = buildSitemap();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.ok(urls.length >= 60, 'Quantidade inesperadamente baixa de URLs: ' + urls.length);
  assert.equal(new Set(urls).size, urls.length, 'Há URLs duplicadas no sitemap.');
  assert.ok(urls.every((url) => url.startsWith('https://www.turkfitness.com.br/')));
  assert.ok(urls.every((url) => !url.includes('{{') && !url.includes('_template')));
  assert.ok(!urls.some((url) => /\/blog-post\.html$|\/404\.html$/i.test(url)));
});
test('sitemap contém páginas fixas, produtos e artigos publicados', () => {
  const xml = buildSitemap();
  assert.match(xml, /<loc>https:\/\/www\.turkfitness\.com\.br\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.turkfitness\.com\.br\/produto\/calca-blue-star\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.turkfitness\.com\.br\/blog\/conjuntos-para-cada-tipo-de-treino-como-escolher-certo\.html<\/loc>/);
});
