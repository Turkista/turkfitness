// Painel Turk Fitness — SEO de páginas de produto
// -----------------------------------------------------------------
// Monta título, meta description, imagem de compartilhamento e dados
// estruturados (JSON-LD) de UM produto, sempre a partir dos dados
// reais já cadastrados (src/content/produtos/<slug>.json) — nunca
// inventa nome, preço, descrição ou disponibilidade.
//
// Usado em dois lugares (mesma lógica, sem duplicar código):
//   1. server.js, toda vez que um produto é criado/editado pelo painel;
//   2. backfill-seo.js, que regera de uma vez as páginas já existentes.
'use strict';

const CATEGORIA_LABEL = {
  legging: 'Legging Fitness',
  top: 'Top Fitness',
  conjunto: 'Conjunto Fitness',
  short: 'Short Fitness',
  regata: 'Regata Fitness',
  jaqueta: 'Jaqueta Fitness',
  acessorio: 'Acessório Fitness',
};

const CATEGORIA_TITULO = {
  legging: 'Legging',
  top: 'Top Fitness',
  conjunto: 'Conjunto Fitness',
  short: 'Short Fitness',
  regata: 'Regata Fitness',
  jaqueta: 'Jaqueta Fitness',
  acessorio: 'Acessório',
};

const CATEGORIA_JA_NO_NOME = {
  legging: /legging/i,
  top: /\\btop\\b/i,
  conjunto: /conjunto/i,
  short: /\\bshort\\b/i,
  regata: /regata/i,
  jaqueta: /jaqueta/i,
  acessorio: /tiara|xuxinha|acessório|acessorio/i,
};

// Direto do enum "status" do schema oficial (src/schema/produto.schema.json) —
// é a única fonte confiável de disponibilidade que existe no cadastro hoje.
const DISPONIBILIDADE_POR_STATUS = {
  publicado: 'https://schema.org/InStock',
  esgotado: 'https://schema.org/OutOfStock',
  descontinuado: 'https://schema.org/Discontinued',
  rascunho: 'https://schema.org/PreOrder',
};

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

function construirSeoProduto(produto, urlBase) {
  const categoriaLabel = CATEGORIA_LABEL[produto.categoria] || 'Moda Fitness';
  const imagemPrincipal = produto.imagens && produto.imagens[0] && produto.imagens[0].arquivo;
  const urlImagem = imagemPrincipal
    ? `${urlBase}/assets/produtos/${imagemPrincipal}`
    : `${urlBase}/assets/hero/turk-fitness-og-padrao.jpg`;
  const urlPagina = `${urlBase}/produto/${produto.slug}.html`;

  const categoriaTitulo = CATEGORIA_TITULO[produto.categoria] || 'Moda Fitness';
  const nomeJaIncluiCategoria = (CATEGORIA_JA_NO_NOME[produto.categoria] || /$a/).test(produto.nome);
  const titulo = nomeJaIncluiCategoria
    ? `${produto.nome} | Turk Fitness`
    : `${produto.nome} — ${categoriaTitulo} | Turk Fitness`;

  // meta description: parte da descrição curta já cadastrada, completando
  // com o benefício de frete (mesma informação da faixa fixa do topo do
  // site) só quando cabe dentro do limite de 160 caracteres do Google.
  const descricaoBase = limparEspacos(produto.descricaoCurta || produto.descricaoCompleta);
  const sufixoFrete = ' Frete grátis acima de R$100 para Sul e Sudeste.';
  let descricao = descricaoBase;
  if ((descricaoBase + sufixoFrete).length <= 160) {
    descricao = descricaoBase + sufixoFrete;
  }
  if (descricao.length > 160) {
    // Evita cortar palavras no meio e mantém a descrição dentro de 160 caracteres.
    const limite = descricao.slice(0, 157);
    const corte = limite.lastIndexOf(' ');
    descricao = (corte > 0 ? limite.slice(0, corte) : limite).trim() + '...';
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produto.nome,
    description: limparEspacos(produto.descricaoCompleta || produto.descricaoCurta),
    image: [urlImagem],
    // Os IDs legados do catálogo não são todos únicos. O slug da página é
    // estável e exclusivo e evita SKU duplicado no JSON-LD entre produtos.
    sku: produto.slug || produto.id,
    brand: { '@type': 'Brand', name: 'Turk Fitness' },
    category: categoriaLabel,
  };

  if (produto.preco && produto.preco.valor) {
    jsonLd.offers = {
      '@type': 'Offer',
      url: urlPagina,
      priceCurrency: 'BRL',
      price: produto.preco.valor,
      availability: DISPONIBILIDADE_POR_STATUS[produto.status] || 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    };
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${urlBase}/` },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${urlBase}/catalogo.html` },
      { '@type': 'ListItem', position: 3, name: produto.nome, item: urlPagina },
    ],
  };

  return {
    titulo,
    descricao,
    urlImagem,
    urlPagina,
    breadcrumbJsonLdTag: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
    // escapa "</" pra um <script type="application/ld+json"> nunca correr
    // risco de ser fechado antes da hora por algum texto de produto.
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

function renderizarDescricaoEstatica(txt) {
  return String(txt || '').replace(/\r/g, '').split(/\n\s*\n/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean)
    .map((paragrafo) => '<p>' + escaparHtml(paragrafo).replace(/\n/g, '<br>') + '</p>')
    .join('\n');
}

// Entrega título, imagem, descrição e dados essenciais no HTML inicial.
// produto-dinamico.js continua responsável pelos controles interativos e
// substitui esse fallback depois que carrega o cadastro completo.
function construirConteudoEstaticoProduto(produto) {
  const categoriaLabel = CATEGORIA_LABEL[produto.categoria] || 'Moda Fitness';
  const imagensCor = produto.cores && produto.cores[0] && produto.cores[0].imagens;
  const imagens = imagensCor && imagensCor.length ? imagensCor : (produto.imagens || []);
  const imagem = imagens[0];
  const imagemHtml = imagem
    ? '<div class="produto-galeria"><div class="produto-galeria__principal">' +
      '<img src="../assets/produtos/' + escaparAtributo(imagem.arquivo) + '" alt="' + escaparAtributo(imagem.alt || produto.nome) + '" loading="eager" decoding="async" fetchpriority="high"></div></div>'
    : '';
  const preco = produto.preco && Number.isFinite(Number(produto.preco.valor))
    ? Number(produto.preco.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Consulte o valor no WhatsApp';
  const descricao = renderizarDescricaoEstatica(produto.descricaoCompleta || produto.descricaoCurta);
  const cores = (produto.cores || []).map((cor) => escaparHtml(cor.nome)).filter(Boolean).join(', ');
  const tamanhos = (produto.tamanhos || []).map(escaparHtml).filter(Boolean).join(', ');
  const tecido = produto.composicao && produto.composicao.tecido;
  const fabricacao = produto.composicao && produto.composicao.paisDeFabricacao;
  const ficha = (tecido || fabricacao)
    ? '<div class="produto-ficha"><dl>' +
      (tecido ? '<dt>Tecido</dt><dd>' + escaparHtml(tecido) + '</dd>' : '') +
      (fabricacao ? '<dt>Fabricação</dt><dd>' + escaparHtml(fabricacao) + '</dd>' : '') +
      '</dl></div>'
    : '';
  const whatsapp = 'https://wa.me/5521992197518?text=' +
    encodeURIComponent('Oi! Tenho interesse na peça "' + produto.nome + '".');

  return '<nav class="breadcrumb" aria-label="Breadcrumb">' +
      '<a href="../index.html">Home</a><span aria-hidden="true">/</span>' +
      '<a href="../catalogo.html">Catálogo</a><span aria-hidden="true">/</span>' +
      '<span aria-current="page">' + escaparHtml(produto.nome) + '</span>' +
    '</nav><div class="produto-grid">' + imagemHtml +
      '<div class="produto-info">' +
        '<span class="produto-info__categoria">' + escaparHtml(categoriaLabel) + ' · Turk Fitness</span>' +
        '<h1>' + escaparHtml(produto.nome) + '</h1>' +
        '<p class="produto-info__preco">' + preco + '</p>' +
        '<div class="produto-info__descricao">' + descricao + '</div>' +
        (cores ? '<div class="produto-secao-escolha"><h3>Cores</h3><p>' + cores + '</p></div>' : '') +
        (tamanhos ? '<div class="produto-secao-escolha"><h3>Tamanhos</h3><p>' + tamanhos + '</p></div>' : '') +
        '<div class="produto-acoes"><a class="botao botao--whatsapp" href="' + escaparAtributo(whatsapp) + '" target="_blank" rel="noopener noreferrer">Comprar pelo WhatsApp</a></div>' +
        ficha +
      '</div></div>';
}

// Substitui os placeholders do template com os metadados e o conteúdo inicial.
function montarHtmlProduto(templateHtml, slug, produto, urlBase) {
  const seo = construirSeoProduto(produto, urlBase);
  return templateHtml
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{TITULO_SEO\}\}/g, escaparAtributo(seo.titulo))
    .replace(/\{\{META_DESCRICAO\}\}/g, escaparAtributo(seo.descricao))
    .replace(/\{\{OG_IMAGEM\}\}/g, escaparAtributo(seo.urlImagem))
    .replace('{{JSON_LD}}', seo.jsonLdTag)
    .replace('{{BREADCRUMB_JSON_LD}}', seo.breadcrumbJsonLdTag)
    .replace('{{CONTEUDO_ESTATICO}}', construirConteudoEstaticoProduto(produto));
}

module.exports = { construirSeoProduto, montarHtmlProduto, CATEGORIA_LABEL };
