#!/usr/bin/env node
'use strict';

// Otimiza WebP já existentes sem alterar nomes, URLs ou dimensões proporcionais.
// Por segurança, a execução padrão é apenas diagnóstico. Use --write para aplicar.
// Executar na pasta painel-turkfitness: npm run images:optimize -- --write

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const DIRS = [
  'assets/produtos',
  'assets/hero',
  'assets/categorias',
  'assets/sobre',
  'assets/blog',
].map((dir) => path.join(ROOT, dir));
const APPLY = process.argv.includes('--write');
const MAX_WIDTH = 800;
const MAX_HEIGHT = 1200;
const QUALITY = 80;

function listarWebp(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listarWebp(fullPath);
    return entry.isFile() && /\.webp$/i.test(entry.name) ? [fullPath] : [];
  });
}

async function otimizar(arquivo) {
  const original = fs.readFileSync(arquivo);
  const metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height) {
    return { arquivo, original: original.length, novo: original.length, ignorado: true };
  }

  const novo = await sharp(original)
    .rotate()
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();

  // Evita regravar imagens sem ganho material ou que ficariam maiores.
  if (novo.length >= original.length * 0.97) {
    return { arquivo, original: original.length, novo: original.length, ignorado: true };
  }

  if (APPLY) {
    const temporario = arquivo + '.optimized.tmp';
    fs.writeFileSync(temporario, novo);
    fs.renameSync(temporario, arquivo);
  }

  return { arquivo, original: original.length, novo: novo.length, ignorado: false };
}

(async () => {
  const arquivos = DIRS.flatMap(listarWebp);
  let totalAntes = 0;
  let totalDepois = 0;
  let candidatos = 0;

  for (const arquivo of arquivos) {
    const resultado = await otimizar(arquivo);
    totalAntes += resultado.original;
    totalDepois += resultado.novo;
    if (!resultado.ignorado) {
      candidatos++;
      const reducao = Math.round((1 - resultado.novo / resultado.original) * 100);
      console.log(`${APPLY ? 'Otimizada' : 'Candidata'}: ${path.relative(ROOT, arquivo)} — ${reducao}% menor`);
    }
  }

  const economia = totalAntes - totalDepois;
  console.log('');
  console.log(`Imagens WebP verificadas: ${arquivos.length}`);
  console.log(`Arquivos com redução estimada: ${candidatos}`);
  console.log(`Economia estimada: ${(economia / 1024).toFixed(1)} KiB`);
  console.log(APPLY
    ? 'Otimização aplicada apenas aos arquivos que ficaram pelo menos 3% menores.'
    : 'Modo diagnóstico: nenhum arquivo foi alterado. Use --write para aplicar.');
})().catch((erro) => {
  console.error('Falha ao otimizar imagens:', erro);
  process.exitCode = 1;
});
