// Regenera sitemap.xml com a mesma validação usada pelo painel e pelo CI.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildSitemap } = require('../scripts/gerar-sitemap');

const ROOT = path.resolve(__dirname, '..');
const sitemapPath = path.join(ROOT, 'sitemap.xml');
const xml = buildSitemap();
fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log('✔ sitemap.xml regenerado com ' + [...xml.matchAll(/<loc>/g)].length + ' URLs canônicas e indexáveis.');
