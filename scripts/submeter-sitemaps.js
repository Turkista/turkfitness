#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const SITES = [
  { name: 'TURKISTA', property: process.env.GSC_PROPERTY_TURKISTA || 'https://www.turkista.com.br/', sitemap: 'https://www.turkista.com.br/sitemap.xml' },
  { name: 'TURKFITNESS', property: process.env.GSC_PROPERTY_TURKFITNESS || 'https://www.turkfitness.com.br/', sitemap: 'https://www.turkfitness.com.br/sitemap.xml' },
];
function base64url(value) { return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function decodeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function urlsFromXml(xml) { return [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gs)].map((match) => decodeXml(match[1].trim())).sort(); }
function assertSameUrls(expected, actual, label) {
  if (expected.length !== actual.length || expected.some((url, index) => url !== actual[index])) {
    const expectedSet = new Set(expected);
    const actualSet = new Set(actual);
    const missing = expected.filter((url) => !actualSet.has(url)).slice(0, 10);
    const extra = actual.filter((url) => !expectedSet.has(url)).slice(0, 10);
    throw new Error(label + ' não corresponde ao sitemap gerado. URLs ausentes: ' + (missing.join(', ') || 'nenhuma') + '; URLs extras: ' + (extra.join(', ') || 'nenhuma') + '. Publique primeiro o sitemap atualizado.');
  }
}
async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) throw new Error('HTTP ' + response.status + ' em ' + url + ': ' + body.slice(0, 800));
  if (!body) return {};
  try { return JSON.parse(body); } catch { return { raw: body }; }
}
async function accessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + '.' + claims;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key);
  const assertion = unsigned + '.' + base64url(signature);
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error('Não foi possível obter token OAuth: HTTP ' + response.status + ' ' + JSON.stringify(payload).slice(0, 800));
  return payload.access_token;
}
async function apiRequest(token, url, options = {}) {
  return request(url, { ...options, headers: { authorization: 'Bearer ' + token, ...(options.headers || {}) } });
}
function csvCell(value) {
  const text = value == null ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
async function inspectUrl(token, site, url) {
  return apiRequest(token, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: site.property, languageCode: 'pt-BR' }),
  });
}
async function main() {
  const secret = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!secret) throw new Error('Configure o segredo GSC_SERVICE_ACCOUNT_JSON nas configurações do repositório antes de executar a integração.');
  const serviceAccount = JSON.parse(secret);
  if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error('GSC_SERVICE_ACCOUNT_JSON precisa conter client_email e private_key do JSON da conta de serviço.');
  const localXml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const expectedUrls = urlsFromXml(localXml);
  if (!expectedUrls.length) throw new Error('O sitemap local não contém URLs.');
  for (const site of SITES) {
    const liveResponse = await fetch(site.sitemap, { headers: { accept: 'application/xml,text/xml' } });
    if (!liveResponse.ok) throw new Error(site.name + ': sitemap público respondeu HTTP ' + liveResponse.status + '.');
    const liveUrls = urlsFromXml(await liveResponse.text());
    assertSameUrls(expectedUrls, liveUrls.sort(), site.name);
    console.log('✔ ' + site.name + ': sitemap público acessível e com ' + liveUrls.length + ' URLs sincronizadas.');
  }
  const token = await accessToken(serviceAccount);
  const report = [];
  for (const site of SITES) {
    const submitUrl = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(site.property) + '/sitemaps/' + encodeURIComponent(site.sitemap);
    await apiRequest(token, submitUrl, { method: 'PUT' });
    console.log('✔ ' + site.name + ': sitemap enviado ao Search Console (' + site.sitemap + ').');
    const listUrl = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(site.property) + '/sitemaps';
    try {
      const sitemapList = await apiRequest(token, listUrl);
      const sitemap = (sitemapList.sitemap || []).find((item) => item.path === site.sitemap);
      if (sitemap) {
        console.log('  Estado: ' + (sitemap.isPending ? 'processamento pendente' : 'consultado') + '; último envio: ' + (sitemap.lastSubmitted || 'não informado') + '; último download: ' + (sitemap.lastDownloaded || 'ainda não informado') + '; erros: ' + (sitemap.errors ?? 0) + '; avisos: ' + (sitemap.warnings ?? 0) + '.');
      } else console.log('  Envio aceito; a API ainda não retornou a entrada do sitemap na listagem.');
    } catch (error) {
      console.warn('  Não foi possível consultar o estado do sitemap: ' + error.message);
    }
    for (let i = 0; i < expectedUrls.length; i++) {
      const url = expectedUrls[i];
      const row = { site: site.name, url, verdict: '', coverageState: '', indexingState: '', lastCrawlTime: '', pageFetchState: '', robotsTxtState: '', googleCanonical: '', userCanonical: '', error: '' };
      try {
        const result = await inspectUrl(token, site, url);
        const status = result.inspectionResult?.indexStatusResult || {};
        row.verdict = status.verdict || '';
        row.coverageState = status.coverageState || '';
        row.indexingState = status.indexingState || '';
        row.lastCrawlTime = status.lastCrawlTime || '';
        row.pageFetchState = status.pageFetchState || '';
        row.robotsTxtState = status.robotsTxtState || '';
        row.googleCanonical = status.googleCanonical || '';
        row.userCanonical = status.userCanonical || '';
      } catch (error) { row.error = error.message; }
      report.push(row);
      if ((i + 1) % 10 === 0 || i + 1 === expectedUrls.length) console.log(site.name + ': inspeção ' + (i + 1) + '/' + expectedUrls.length);
      if (i + 1 < expectedUrls.length) await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  const columns = ['site', 'url', 'verdict', 'coverageState', 'indexingState', 'lastCrawlTime', 'pageFetchState', 'robotsTxtState', 'googleCanonical', 'userCanonical', 'error'];
  const csv = [columns.join(','), ...report.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\n') + '\n';
  const reportPath = process.env.REPORT_PATH || path.join(os.tmpdir(), 'search-console-indexing-report.csv');
  fs.writeFileSync(reportPath, csv, 'utf8');
  const indexed = report.filter((row) => row.verdict === 'PASS').length;
  const failed = report.filter((row) => row.error).length;
  console.log('Relatório salvo em ' + reportPath);
  console.log('Resumo: ' + indexed + '/' + report.length + ' URLs com verdict PASS; ' + failed + ' inspeções com erro de API.');
  if (failed) process.exitCode = 1;
}
main().catch((error) => { console.error('✘ ' + error.message); process.exitCode = 1; });
