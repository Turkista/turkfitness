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

  const titulo = `${produto.nome} — ${categoriaLabel} | Turk Fitness`;

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
    descricao = descricao.slice(0, 157).trim() + '...';
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produto.nome,
    description: limparEspacos(produto.descricaoCompleta || produto.descricaoCurta),
    image: [urlImagem],
    sku: produto.id,
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

  return {
    titulo,
    descricao,
    urlImagem,
    urlPagina,
    // escapa "</" pra um <script type="application/ld+json"> nunca correr
    // risco de ser fechado antes da hora por algum texto de produto.
    jsonLdTag: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  };
}

// Substitui os placeholders do _template.html pelos dados de SEO de um
// produto específico. slug já vem calculado por quem chama (painel ou
// backfill), pra não duplicar essa regra em dois lugares.
function montarHtmlProduto(templateHtml, slug, produto, urlBase) {
  const seo = construirSeoProduto(produto, urlBase);
  return templateHtml
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{TITULO_SEO\}\}/g, escaparAtributo(seo.titulo))
    .replace(/\{\{META_DESCRICAO\}\}/g, escaparAtributo(seo.descricao))
    .replace(/\{\{OG_IMAGEM\}\}/g, escaparAtributo(seo.urlImagem))
    .replace('{{JSON_LD}}', seo.jsonLdTag);
}

module.exports = { construirSeoProduto, montarHtmlProduto, CATEGORIA_LABEL };
