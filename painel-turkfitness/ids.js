'use strict';

function criarIdUnico(prefixo, slug, idsExistentes = []) {
  const base = `${prefixo}_${String(slug || '').replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
  const usados = new Set((idsExistentes || []).filter(Boolean));
  let id = base;
  let sufixo = 2;
  while (usados.has(id)) {
    id = `${base}${sufixo}`;
    sufixo += 1;
  }
  return id;
}

function gerarIdProduto(slug, idsExistentes) {
  return criarIdUnico('prod', slug, idsExistentes);
}

function gerarIdPost(slug, idsExistentes) {
  return criarIdUnico('post', slug, idsExistentes);
}

module.exports = { gerarIdProduto, gerarIdPost };
