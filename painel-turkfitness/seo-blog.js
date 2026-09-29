// Painel Turk Fitness — SEO de páginas de post do blog
// -----------------------------------------------------------------
// Mesma lógica de painel-turkfitness/seo-produto.js, só que para
// posts do blog: monta título, meta description, imagem de
// compartilhamento e dados estruturados (JSON-LD BlogPosting) a
// partir SOMENTE dos dados reais do post (nunca inventa nada).
'use strict';

function limparEspacos(txt) {
  return String(txt || '').replace(/\s+/g, ' ').trim();
}

function escaparAtributo(txt) {
  return String(txt)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function construirSeoBlog(post, urlBase) {
  const urlImagem = post.imagem
    ? `${urlBase}/${String(post.imagem).replace(/^\//, '')}`
    : `${urlBase}/assets/hero/turk-fitness-og-padrao.jpg`;
  const urlPagina = `${urlBase}/blog/${post.slug}.html`;

  const titulo = `${post.titulo} — Blog Turk Fitness`;

  const descricaoBase = limparEspacos(post.resumo);
  let descricao = descricaoBase;
  if (descricao.length > 160) {
    descricao = descricao.slice(0, 157).trim() + '...';
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titulo,
    description: descricaoBase,
    image: [urlImagem],
    datePublished: post.dataPublicacao || post.dataCriacao,
    dateModified: post.dataPublicacao || post.dataCriacao,
    author: { '@type': 'Organization', name: 'Turk Fitness' },
    publisher: {
      '@type': 'Organization',
      name: 'Turk Fitness',
      logo: { '@type': 'ImageObject', url: `${urlBase}/assets/hero/turk-fitness-og-padrao.jpg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': urlPagina },
  };
  if (post.categoria) jsonLd.articleSection = post.categoria;

  return {
    titulo,
    descricao,
    urlImagem,
    urlPagina,
    jsonLdTag: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  };
}

function montarHtmlBlog(templateHtml, slug, post, urlBase) {
  const seo = construirSeoBlog(post, urlBase);
  return templateHtml
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{TITULO_SEO\}\}/g, escaparAtributo(seo.titulo))
    .replace(/\{\{META_DESCRICAO\}\}/g, escaparAtributo(seo.descricao))
    .replace(/\{\{OG_IMAGEM\}\}/g, escaparAtributo(seo.urlImagem))
    .replace('{{JSON_LD}}', seo.jsonLdTag);
}

module.exports = { construirSeoBlog, montarHtmlBlog };
