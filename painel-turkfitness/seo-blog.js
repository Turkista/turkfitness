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

  const titulo = limparEspacos(post.tituloSeo) || `${post.titulo} — Blog Turk Fitness`;

  const descricaoBase = limparEspacos(post.resumo);
  let descricao = descricaoBase;
  if (descricao.length > 160) {
    // Evita cortar palavras no meio e mantém a descrição dentro de 160 caracteres.
    const limite = descricao.slice(0, 157);
    const corte = limite.lastIndexOf(' ');
    descricao = (corte > 0 ? limite.slice(0, corte) : limite).trim() + '...';
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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${urlBase}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${urlBase}/blog.html` },
      { '@type': 'ListItem', position: 3, name: post.titulo, item: urlPagina },
    ],
  };

  return {
    titulo,
    descricao,
    urlImagem,
    urlPagina,
    breadcrumbJsonLdTag: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
    jsonLdTag: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  };
}

function escaparHtml(txt) {
  return String(txt == null ? '' : txt)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderizarInlineMarkdown(texto) {
  return texto.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(match, rotulo, destino) {
    if (!/^(https:\/\/|\/|\.\/|\.\.\/)/i.test(destino)) return rotulo;
    const externo = /^https:\/\//i.test(destino);
    return '<a href="' + destino + '"' +
      (externo ? ' target="_blank" rel="noopener noreferrer"' : '') +
      '>' + rotulo + '</a>';
  });
}

function renderizarMarkdownEstatico(conteudo) {
  const linhas = escaparHtml(conteudo).split(/\r?\n/);
  const blocos = [];
  let itensLista = [];

  function fecharLista() {
    if (itensLista.length) {
      blocos.push('<ul>' + itensLista.map((item) => '<li>' + renderizarInlineMarkdown(item) + '</li>').join('') + '</ul>');
      itensLista = [];
    }
  }

  linhas.forEach((linha) => {
    const texto = linha.trim();
    if (!texto) return;
    if (texto.slice(0, 2) === '- ') {
      itensLista.push(texto.slice(2));
      return;
    }
    fecharLista();
    if (texto.slice(0, 3) === '## ') {
      blocos.push('<h2>' + renderizarInlineMarkdown(texto.slice(3)) + '</h2>');
    } else if (texto.slice(0, 4) === '### ') {
      blocos.push('<h3>' + renderizarInlineMarkdown(texto.slice(4)) + '</h3>');
    } else {
      blocos.push('<p>' + renderizarInlineMarkdown(texto) + '</p>');
    }
  });
  fecharLista();
  return blocos.join('\n');
}

function formatarDataEstatica(valor) {
  const data = String(valor || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data.split('-').reverse().join('/') : escaparHtml(data);
}

// O artigo já chega com título, imagem, H1 e texto no HTML inicial.
// blog-post.js hidrata a mesma área para manter a navegação interativa.
function construirConteudoEstaticoBlog(post) {
  const dataIso = String(post.dataPublicacao || post.dataCriacao || '').slice(0, 10);
  const imagem = post.imagem ? '../' + String(post.imagem).replace(/^\/+/, '') : '';
  return '<div class="blog-post__meta">' +
      (post.categoria ? escaparHtml(post.categoria) + ' · ' : '') +
      '<time' + (dataIso ? ' datetime="' + escaparAtributo(dataIso) + '"' : '') + '>' +
      formatarDataEstatica(dataIso) + '</time></div>' +
    '<h1>' + escaparHtml(post.titulo) + '</h1>' +
    (imagem ? '<img class="blog-post__imagem" src="' + escaparAtributo(imagem) + '" alt="' + escaparAtributo(post.titulo) + '" loading="eager" decoding="async" fetchpriority="high">' : '') +
    '<div class="blog-post__conteudo">' + renderizarMarkdownEstatico(post.conteudo || post.resumo || '') + '</div>' +
    '<div class="blog-post__cta"><p>Gostou do conteúdo? Confira as peças da Turk Fitness.</p>' +
    '<a href="../catalogo.html" class="botao botao--primario">Ver catálogo</a></div>';
}

function montarHtmlBlog(templateHtml, slug, post, urlBase) {
  const seo = construirSeoBlog(post, urlBase);
  return templateHtml
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{TITULO_SEO\}\}/g, escaparAtributo(seo.titulo))
    .replace(/\{\{META_DESCRICAO\}\}/g, escaparAtributo(seo.descricao))
    .replace(/\{\{OG_IMAGEM\}\}/g, escaparAtributo(seo.urlImagem))
    .replace('{{JSON_LD}}', seo.jsonLdTag)
    .replace('{{BREADCRUMB_JSON_LD}}', seo.breadcrumbJsonLdTag)
    .replace('{{CONTEUDO_ESTATICO}}', construirConteudoEstaticoBlog(post));
}

module.exports = { construirSeoBlog, montarHtmlBlog };
