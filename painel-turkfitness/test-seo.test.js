'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { construirSeoProduto, montarHtmlProduto } = require('./seo-produto');
const { construirSeoBlog, montarHtmlBlog } = require('./seo-blog');
const { gerarIdProduto, gerarIdPost } = require('./ids');

const raiz = path.resolve(__dirname, '..');
const base = 'https://www.turkfitness.com.br';
const lerJson = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const produtos = lerJson('src/content/produtos/index.json').filter((p) => p.status === 'publicado');
const posts = lerJson('src/content/blog/index.json').filter((p) => p.status === 'publicado');
const sitemap = fs.readFileSync(path.join(raiz, 'sitemap.xml'), 'utf8');

test('a página inicial usa a raiz como URL canônica e Open Graph', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.turkfitness\.com\.br\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/www\.turkfitness\.com\.br\/">/);
  assert.doesNotMatch(html, /rel="canonical" href="https:\/\/www\.turkfitness\.com\.br\/index\.html"/);
});

test('cada produto publicado gera SKU único no JSON-LD', () => {
  const skus = produtos.map((produto) => {
    const seo = construirSeoProduto(produto, base);
    const jsonLd = JSON.parse(seo.jsonLdTag);
    assert.equal(jsonLd['@type'], 'Product');
    assert.equal(jsonLd.sku, produto.slug);
    const breadcrumb = JSON.parse(seo.breadcrumbJsonLdTag);
    assert.equal(breadcrumb['@type'], 'BreadcrumbList');
    assert.equal(breadcrumb.itemListElement.length, 3);
    assert.equal(breadcrumb.itemListElement[2].item, `${base}/produto/${produto.slug}.html`);
    return jsonLd.sku;
  });
  assert.equal(new Set(skus).size, skus.length, 'SKU duplicado entre produtos publicados');
});

test('todos os produtos publicados geram título e meta description dentro do limite', () => {
  for (const produto of produtos) {
    const seo = construirSeoProduto(produto, base);
    assert.ok(seo.titulo.trim().length > 0, `Título ausente: ${produto.slug}`);
    assert.ok(seo.titulo.length <= 65, `Título SEO longo demais: ${produto.slug} (${seo.titulo.length})`);
    assert.ok(seo.descricao.length <= 160, `Descrição longa demais: ${produto.slug}`);
  }
});

test('descrições longas de produtos e artigos não terminam com palavra cortada', () => {
  const textoLongo = 'Legging confortável e tecido respirável para treinos '.repeat(8);
  const produto = construirSeoProduto({
    nome: 'Produto de teste',
    slug: 'produto-de-teste',
    descricaoCurta: textoLongo,
    descricaoCompleta: textoLongo,
    imagens: [],
    status: 'publicado',
  }, base);
  const post = construirSeoBlog({
    titulo: 'Artigo de teste',
    slug: 'artigo-de-teste',
    resumo: textoLongo,
  }, base);

  for (const descricao of [produto.descricao, post.descricao]) {
    assert.ok(descricao.length <= 160);
    assert.match(descricao, /(?:legging|confortável|e|tecido|respirável|para|treinos)\.\.\.$/i);
  }
});

test('as meta descriptions geradas para artigos não excedem 160 caracteres', () => {
  for (const post of posts) {
    const seo = construirSeoBlog(post, base);
    assert.ok(seo.descricao.length <= 160, `Descrição longa demais: ${post.slug}`);
    assert.ok(seo.titulo.trim().length > 0, `Título ausente: ${post.slug}`);
    assert.ok(seo.titulo.length <= 65, `Título SEO longo demais: ${post.slug} (${seo.titulo.length})`);
    assert.equal(JSON.parse(seo.jsonLdTag)['@type'], 'BlogPosting');
    const breadcrumb = JSON.parse(seo.breadcrumbJsonLdTag);
    assert.equal(breadcrumb['@type'], 'BreadcrumbList');
    assert.equal(breadcrumb.itemListElement.length, 3);
    assert.equal(breadcrumb.itemListElement[2].item, `${base}/blog/${post.slug}.html`);
  }
});

test('o sitemap inclui todas as páginas de produto e artigos publicados', () => {
  const urls = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
  for (const produto of produtos) {
    assert.ok(urls.has(`${base}/produto/${produto.slug}.html`), `Produto ausente do sitemap: ${produto.slug}`);
  }
  for (const post of posts) {
    assert.ok(urls.has(`${base}/blog/${post.slug}.html`), `Artigo ausente do sitemap: ${post.slug}`);
  }
  assert.ok(urls.has(`${base}/`), 'Página inicial ausente do sitemap');
  assert.ok(urls.has(`${base}/catalogo.html`), 'Catálogo ausente do sitemap');
});


test('todas as páginas estáticas publicadas têm canonical e JSON-LD atualizado', () => {
  for (const produto of produtos) {
    const arquivo = path.join(raiz, 'produto', `${produto.slug}.html`);
    const html = fs.readFileSync(arquivo, 'utf8');
    assert.match(html, new RegExp(`<link rel="canonical" href="${base}/produto/${produto.slug}\\.html">`), `Canonical incorreto: ${produto.slug}`);
    const scripts = html.split('<script type="application/ld+json">').slice(1).map((part) => part.split('</script>')[0]);
    const dados = scripts.map((conteudo) => JSON.parse(conteudo));
    const produtoLd = dados.find((item) => item['@type'] === 'Product');
    const breadcrumb = dados.find((item) => item['@type'] === 'BreadcrumbList');
    assert.ok(produtoLd, `Product JSON-LD ausente: ${produto.slug}`);
    assert.equal(produtoLd.sku, produto.slug, `SKU estático incorreto: ${produto.slug}`);
    assert.ok(breadcrumb, `BreadcrumbList ausente: ${produto.slug}`);
    assert.equal(breadcrumb.itemListElement[2].item, `${base}/produto/${produto.slug}.html`);
  }

  for (const post of posts) {
    const arquivo = path.join(raiz, 'blog', `${post.slug}.html`);
    const html = fs.readFileSync(arquivo, 'utf8');
    assert.match(html, new RegExp(`<link rel="canonical" href="${base}/blog/${post.slug}\\.html">`), `Canonical incorreto: ${post.slug}`);
    const scripts = html.split('<script type="application/ld+json">').slice(1).map((part) => part.split('</script>')[0]);
    const dados = scripts.map((conteudo) => JSON.parse(conteudo));
    assert.ok(dados.some((item) => item['@type'] === 'BlogPosting'), `BlogPosting JSON-LD ausente: ${post.slug}`);
    const breadcrumb = dados.find((item) => item['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumb, `BreadcrumbList ausente: ${post.slug}`);
    assert.equal(breadcrumb.itemListElement[2].item, `${base}/blog/${post.slug}.html`);
  }
});


test('páginas estáticas publicadas têm conteúdo inicial indexável', () => {
  for (const produto of produtos) {
    const arquivo = path.join(raiz, 'produto', `${produto.slug}.html`);
    const html = fs.readFileSync(arquivo, 'utf8');
    assert.match(html, /<title>[^<]+<\\/title>/i, `Title ausente: ${produto.slug}`);
    assert.match(html, /<meta name="description" content="[^"]+">/i, `Meta description ausente: ${produto.slug}`);
    assert.match(html, /<h1\\b[^>]*>\\s*[^<]+\\s*<\\/h1>/i, `H1 ausente no HTML inicial: ${produto.slug}`);
    assert.match(html, /<img[^>]+loading="eager"[^>]+fetchpriority="high"/i, `Imagem principal sem prioridade de carregamento: ${produto.slug}`);
  }

  for (const post of posts) {
    const arquivo = path.join(raiz, 'blog', `${post.slug}.html`);
    const html = fs.readFileSync(arquivo, 'utf8');
    assert.match(html, /<title>[^<]+<\\/title>/i, `Title ausente: ${post.slug}`);
    assert.match(html, /<meta name="description" content="[^"]+">/i, `Meta description ausente: ${post.slug}`);
    assert.match(html, /<h1\\b[^>]*>\\s*[^<]+\\s*<\\/h1>/i, `H1 ausente no HTML inicial: ${post.slug}`);
  }
});

test('páginas estáticas publicadas não exibem link para categoria sem produtos', () => {
  const arquivos = [
    ...produtos.map((produto) => path.join(raiz, 'produto', `${produto.slug}.html`)),
    ...posts.map((post) => path.join(raiz, 'blog', `${post.slug}.html`)),
  ];

  for (const arquivo of arquivos) {
    const html = fs.readFileSync(arquivo, 'utf8');
    assert.doesNotMatch(html, /catalogo\.html#regata/i, `Link obsoleto para Regatas: ${path.relative(raiz, arquivo)}`);
  }
});

test('IDs e slugs de produtos e artigos publicados são únicos', () => {
  const idsProdutos = produtos.map((produto) => produto.id);
  const slugsProdutos = produtos.map((produto) => produto.slug);
  const idsPosts = posts.map((post) => post.id);
  const slugsPosts = posts.map((post) => post.slug);

  assert.equal(new Set(idsProdutos).size, idsProdutos.length, 'ID duplicado no índice de produtos');
  assert.equal(new Set(slugsProdutos).size, slugsProdutos.length, 'Slug duplicado no índice de produtos');
  assert.equal(new Set(idsPosts).size, idsPosts.length, 'ID duplicado no índice do blog');
  assert.equal(new Set(slugsPosts).size, slugsPosts.length, 'Slug duplicado no índice do blog');
});

test('produtos publicados cumprem os campos essenciais do cadastro e sincronizam com o índice', () => {
  const categoriasPermitidas = new Set(['legging', 'top', 'conjunto', 'short', 'regata', 'jaqueta', 'acessorio']);
  const statusPermitidos = new Set(['rascunho', 'publicado', 'esgotado', 'descontinuado']);

  for (const resumo of produtos) {
    const produto = lerJson(`src/content/produtos/${resumo.slug}.json`);
    assert.equal(produto.id, resumo.id, `ID divergente entre cadastro e índice: ${resumo.slug}`);
    assert.equal(produto.slug, resumo.slug, `Slug divergente entre cadastro e índice: ${resumo.slug}`);
    for (const campo of ['id', 'slug', 'nome', 'categoria', 'descricaoCurta', 'composicao', 'cores', 'tamanhos', 'imagens', 'status']) {
      assert.ok(Object.hasOwn(produto, campo), `Campo obrigatório ausente (${campo}): ${resumo.slug}`);
    }
    assert.match(produto.id, /^prod_[a-z0-9]{6,}$/, `Formato de ID inválido: ${resumo.slug}`);
    assert.match(produto.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `Slug inválido: ${resumo.slug}`);
    assert.ok(String(produto.nome).trim(), `Nome vazio: ${resumo.slug}`);
    assert.ok(categoriasPermitidas.has(produto.categoria), `Categoria inválida: ${resumo.slug}`);
    assert.ok(String(produto.descricaoCurta).length <= 160, `Descrição curta excede 160 caracteres: ${resumo.slug}`);
    assert.ok(produto.composicao && typeof produto.composicao.tecido === 'string' && produto.composicao.tecido.trim(), `Composição/tecido ausente: ${resumo.slug}`);
    assert.ok(Array.isArray(produto.cores) && produto.cores.length > 0, `Cores ausentes: ${resumo.slug}`);
    assert.ok(Array.isArray(produto.tamanhos) && produto.tamanhos.length > 0, `Tamanhos ausentes: ${resumo.slug}`);
    assert.ok(produto.tamanhos.every((tamanho) => ['PP', 'P', 'M', 'G', 'GG'].includes(tamanho)), `Tamanho fora do schema: ${resumo.slug}`);
    assert.ok(Array.isArray(produto.cores) && produto.cores.every((cor) => cor.nome && /^#[0-9A-Fa-f]{6}$/.test(cor.hex) && Array.isArray(cor.imagens) && cor.imagens.length > 0), `Cor fora do schema: ${resumo.slug}`);
    assert.ok(Array.isArray(produto.imagens) && produto.imagens.length > 0, `Imagens ausentes: ${resumo.slug}`);
    assert.ok(produto.imagens.every((imagem) => imagem.arquivo && imagem.alt), `Imagem sem arquivo ou alt: ${resumo.slug}`);
    assert.ok(produto.imagens.every((imagem) => fs.existsSync(path.join(raiz, 'assets', 'produtos', imagem.arquivo))), `Arquivo de imagem não encontrado: ${resumo.slug}`);
    assert.ok(statusPermitidos.has(produto.status), `Status inválido: ${resumo.slug}`);
    if (produto.preco?.valor != null) assert.ok(Number.isFinite(produto.preco.valor) && produto.preco.valor > 0, `Preço inválido: ${resumo.slug}`);
  }
});

test('geradores do painel evitam reutilizar IDs já existentes', () => {
  const idsProdutos = produtos.map((produto) => produto.id);
  const idProduto = gerarIdProduto('produto-de-teste', idsProdutos);
  assert.match(idProduto, /^prod_[a-z0-9]{6,}$/);
  assert.ok(!idsProdutos.includes(idProduto));

  const idProdutoColisao = gerarIdProduto('produto-de-teste', [...idsProdutos, idProduto]);
  assert.notEqual(idProdutoColisao, idProduto);

  const idsPosts = posts.map((post) => post.id);
  const idPost = gerarIdPost('artigo-de-teste', idsPosts);
  assert.match(idPost, /^post_[a-z0-9]+$/);
  assert.ok(!idsPosts.includes(idPost));

  const idPostColisao = gerarIdPost('artigo-de-teste', [...idsPosts, idPost]);
  assert.notEqual(idPostColisao, idPost);
});


test('artigos publicados têm identificador e conteúdo essencial', () => {
  for (const post of posts) {
    assert.match(post.id, /^post_[a-z0-9]+$/, `ID de artigo inválido: ${post.slug}`);
    assert.ok(post.slug && post.titulo && post.resumo && post.conteudo, `Conteúdo essencial ausente: ${post.slug}`);
    assert.ok(['publicado', 'rascunho', 'esgotado', 'descontinuado'].includes(post.status), `Status de artigo inválido: ${post.slug}`);
  }
});


test('links contextuais dos artigos apontam para páginas internas existentes ou HTTPS', () => {
  const paginasInternas = new Set([
    '/',
    '/catalogo.html',
    '/sobre-a-marca.html',
    '/contato.html',
    '/como-cuidar-da-peca.html',
    '/faq.html',
    '/rastreie-seu-pedido.html',
    '/politica-de-envio-e-prazo-de-entrega.html',
    '/politica-de-troca-e-reembolso.html',
    '/politica-de-privacidade.html',
    ...produtos.map((produto) => `/produto/${produto.slug}.html`),
    ...posts.map((post) => `/blog/${post.slug}.html`),
  ]);

  for (const post of posts) {
    const links = [...post.conteudo.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    assert.ok(links.length > 0, `Artigo sem links contextuais: ${post.slug}`);
    let linksInternos = 0;

    for (const [, rotulo, destino] of links) {
      assert.ok(rotulo.trim(), `Link sem texto âncora: ${post.slug}`);
      if (destino.startsWith('/')) {
        const caminho = destino.split(/[?#]/)[0];
        assert.ok(paginasInternas.has(caminho), `Link interno sem destino conhecido (${destino}) no artigo ${post.slug}`);
        linksInternos += 1;
      } else {
        assert.ok(destino.startsWith('https://'), `Destino externo não HTTPS: ${destino}`);
      }
    }

    assert.ok(linksInternos > 0, `Artigo sem links internos: ${post.slug}`);
  }
});


test('geradores incluem título e conteúdo principal no HTML inicial', () => {
  const templateProduto = fs.readFileSync(path.join(raiz, 'produto/_template.html'), 'utf8');
  const templateBlog = fs.readFileSync(path.join(raiz, 'blog/_template.html'), 'utf8');
  const produto = lerJson(`src/content/produtos/${produtos[0].slug}.json`);
  const htmlProduto = montarHtmlProduto(templateProduto, produto.slug, produto, base);
  assert.ok(htmlProduto.includes('<h1>'), 'H1 não foi gerado para produto');
  assert.ok(htmlProduto.includes('produto-info__descricao'), 'Descrição do produto não foi gerada');
  assert.ok(!htmlProduto.includes('Carregando produto'), 'Placeholder do produto permaneceu');
  assert.ok(!htmlProduto.includes('{{CONTEUDO_ESTATICO}}'), 'Placeholder do conteúdo do produto permaneceu');

  const htmlBlog = montarHtmlBlog(templateBlog, posts[0].slug, posts[0], base);
  assert.ok(htmlBlog.includes('<h1>'), 'H1 não foi gerado para artigo');
  assert.ok(htmlBlog.includes('blog-post__conteudo'), 'Conteúdo do artigo não foi gerado');
  assert.ok(htmlBlog.includes('<h2>'), 'Subtítulos do artigo não foram gerados');
  assert.ok(htmlBlog.includes('<a href="/catalogo.html'), 'Links Markdown do artigo não foram renderizados');
  assert.ok(!htmlBlog.includes('Carregando…'), 'Placeholder do artigo permaneceu');
  assert.ok(!htmlBlog.includes('{{CONTEUDO_ESTATICO}}'), 'Placeholder do conteúdo do artigo permaneceu');
});


test('páginas estáticas publicadas entregam título e conteúdo sem esperar JavaScript', () => {
  for (const produto of produtos) {
    const html = fs.readFileSync(path.join(raiz, 'produto', `${produto.slug}.html`), 'utf8');
    assert.ok(html.includes('<h1>'), `H1 ausente no produto: ${produto.slug}`);
    assert.ok(html.includes('produto-info__descricao'), `Descrição ausente no produto: ${produto.slug}`);
    assert.ok(!html.includes('Carregando produto'), `Placeholder no produto: ${produto.slug}`);
    assert.ok(!html.includes('{{CONTEUDO_ESTATICO}}'), `Placeholder de conteúdo no produto: ${produto.slug}`);
  }

  for (const post of posts) {
    const html = fs.readFileSync(path.join(raiz, 'blog', `${post.slug}.html`), 'utf8');
    assert.ok(html.includes('<h1>'), `H1 ausente no artigo: ${post.slug}`);
    assert.ok(html.includes('blog-post__conteudo'), `Conteúdo ausente no artigo: ${post.slug}`);
    assert.ok(!html.includes('Carregando…'), `Placeholder no artigo: ${post.slug}`);
    assert.ok(!html.includes('](/'), `Link Markdown não renderizado no artigo: ${post.slug}`);
    assert.ok(!html.includes('{{CONTEUDO_ESTATICO}}'), `Placeholder de conteúdo no artigo: ${post.slug}`);
  }
});


test('títulos HTML estáticos correspondem aos geradores SEO e respeitam 65 caracteres', () => {
  function textoDoTitle(html) {
    const linha = html.split('\n').find((item) => item.startsWith('<title>'));
    assert.ok(linha, 'Tag title ausente');
    return linha.replace('<title>', '').replace('</title>', '')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  for (const produto of produtos) {
    const html = fs.readFileSync(path.join(raiz, 'produto', `${produto.slug}.html`), 'utf8');
    const cadastro = lerJson(`src/content/produtos/${produto.slug}.json`);
    const titulo = textoDoTitle(html);
    assert.equal(titulo, construirSeoProduto(cadastro, base).titulo, `Título HTML fora de sincronia: ${produto.slug}`);
    assert.ok(titulo.length <= 65, `Título HTML muito longo: ${produto.slug}`);
  }

  for (const post of posts) {
    const html = fs.readFileSync(path.join(raiz, 'blog', `${post.slug}.html`), 'utf8');
    const titulo = textoDoTitle(html);
    assert.equal(titulo, construirSeoBlog(post, base).titulo, `Título HTML fora de sincronia: ${post.slug}`);
    assert.ok(titulo.length <= 65, `Título HTML muito longo: ${post.slug}`);
  }
});


test('cadastros individuais correspondem ao índice do catálogo em todos os campos públicos', () => {
  const camposPublicos = ['id', 'slug', 'nome', 'categoria', 'preco', 'imagens', 'badges', 'tags', 'status'];

  for (const resumo of produtos) {
    const cadastro = lerJson(`src/content/produtos/${resumo.slug}.json`);
    for (const campo of camposPublicos) {
      assert.deepEqual(cadastro[campo], resumo[campo], `Campo ${campo} divergente entre índice e cadastro: ${resumo.slug}`);
    }

    const arquivosDeImagem = [
      ...(cadastro.imagens || []),
      ...(cadastro.cores || []).flatMap((cor) => cor.imagens || []),
    ];
    for (const imagem of arquivosDeImagem) {
      assert.ok(imagem.arquivo && String(imagem.arquivo).trim(), `Arquivo de imagem ausente: ${resumo.slug}`);
      assert.ok(imagem.alt && String(imagem.alt).trim(), `Texto alt ausente: ${resumo.slug} / ${imagem.arquivo}`);
      assert.ok(
        fs.existsSync(path.join(raiz, 'assets', 'produtos', imagem.arquivo)),
        `Imagem de cor não encontrada: ${resumo.slug} / ${imagem.arquivo}`,
      );
    }

    if (cadastro.preco?.valor != null) {
      assert.equal(typeof cadastro.preco.valor, 'number', `Preço não numérico: ${resumo.slug}`);
      assert.ok(Number.isFinite(cadastro.preco.valor) && cadastro.preco.valor > 0, `Preço fora do intervalo válido: ${resumo.slug}`);
    }
  }
});

test('sitemap não contém URLs duplicadas nem rotas de produto/artigo não publicadas', () => {
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(urls).size, urls.length, 'URL duplicada no sitemap');

  const produtoUrls = urls.filter((url) => url.includes('/produto/'));
  const artigoUrls = urls.filter((url) => url.includes('/blog/'));
  assert.equal(produtoUrls.length, produtos.length, 'Quantidade de URLs de produto no sitemap diverge do catálogo publicado');
  assert.equal(artigoUrls.length, posts.length, 'Quantidade de URLs de artigo no sitemap diverge do blog publicado');

  for (const url of produtoUrls) {
    assert.ok(produtos.some((produto) => url === `${base}/produto/${produto.slug}.html`), `Produto no sitemap não está publicado: ${url}`);
  }
  for (const url of artigoUrls) {
    assert.ok(posts.some((post) => url === `${base}/blog/${post.slug}.html`), `Artigo no sitemap não está publicado: ${url}`);
  }
});


test('filtros do catálogo correspondem às categorias publicadas ou a produtos com short', () => {
  const catalogo = fs.readFileSync(path.join(raiz, 'catalogo.html'), 'utf8');
  const script = fs.readFileSync(path.join(raiz, 'src/scripts/componentes/catalogo-dinamico.js'), 'utf8');
  const filtros = [...catalogo.matchAll(/data-filtro-categoria="([^"]+)"/g)].map((match) => match[1]);
  const categorias = new Set(produtos.map((produto) => produto.categoria));

  for (const filtro of filtros.filter((categoria) => categoria !== 'todas')) {
    const temCategoria = categorias.has(filtro);
    const temShortEmConjunto = filtro === 'short' && produtos.some((produto) =>
      /\bshorts?\b/i.test(produto.nome || '') ||
      (produto.tags || []).some((tag) => /\bshorts?\b/i.test(tag)),
    );
    assert.ok(temCategoria || temShortEmConjunto, `Filtro sem produto correspondente: ${filtro}`);
  }

  assert.match(script, /function correspondeCategoria/);
  assert.match(script, /function atualizarFiltrosDisponiveis/);
  assert.doesNotMatch(catalogo, /catalogo\.html#regata/);
});
