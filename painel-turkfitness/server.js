// Painel Turk Fitness — cadastra produtos e fotos do site, sem precisar mexer em código.
// Roda local, não depende de internet (depois de instalado) e não sobe nada pra fora
// do seu computador. Mesmo espírito do Painel Turkista original, adaptado para uma
// marca com uma linha só (moda academia) — por isso não existe mais o campo "linha".

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const RAIZ_SITE = path.join(__dirname, '..');
const DIR_PRODUTOS_JSON = path.join(RAIZ_SITE, 'src', 'content', 'produtos');
const DIR_ASSETS_PRODUTOS = path.join(RAIZ_SITE, 'assets', 'produtos');
const DIR_ASSETS_HERO = path.join(RAIZ_SITE, 'assets', 'hero');
const DIR_ASSETS_CATEGORIAS = path.join(RAIZ_SITE, 'assets', 'categorias');
const DIR_ASSETS_SOBRE = path.join(RAIZ_SITE, 'assets', 'sobre');
const DIR_PRODUTO_PAGINAS = path.join(RAIZ_SITE, 'produto');
const CAMINHO_INDICE = path.join(DIR_PRODUTOS_JSON, 'index.json');
const CAMINHO_TEMPLATE_PRODUTO = path.join(DIR_PRODUTO_PAGINAS, '_template.html');
const CAMINHO_SITEMAP = path.join(RAIZ_SITE, 'sitemap.xml');
const DIR_BLOG_JSON = path.join(RAIZ_SITE, 'src', 'content', 'blog');
const CAMINHO_BLOG_INDICE = path.join(DIR_BLOG_JSON, 'index.json');
const DIR_ASSETS_BLOG = path.join(RAIZ_SITE, 'assets', 'blog');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/site', express.static(RAIZ_SITE));

// ---------- utilidades ----------

function slugificar(texto){
  return String(texto)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function gerarId(prefixo){
  return 'prod_' + prefixo.replace(/-/g, '').slice(0, 6).padEnd(6, '0') + Math.random().toString(36).slice(2, 4);
}

function listarProdutos(){
  if(!fs.existsSync(DIR_PRODUTOS_JSON)) return [];
  return fs.readdirSync(DIR_PRODUTOS_JSON)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => {
      try{ return JSON.parse(fs.readFileSync(path.join(DIR_PRODUTOS_JSON, f), 'utf8')); }
      catch(e){ return null; }
    })
    .filter(Boolean);
}

function garantirBlog(){
  if(!fs.existsSync(DIR_BLOG_JSON)) fs.mkdirSync(DIR_BLOG_JSON, { recursive:true });
  if(!fs.existsSync(CAMINHO_BLOG_INDICE)) fs.writeFileSync(CAMINHO_BLOG_INDICE, '[]', 'utf8');
}
function listarPosts(){
  garantirBlog();
  try{
    const dados = JSON.parse(fs.readFileSync(CAMINHO_BLOG_INDICE, 'utf8'));
    return Array.isArray(dados) ? dados : [];
  }catch(e){ return []; }
}
function salvarPosts(posts){
  garantirBlog();
  fs.writeFileSync(CAMINHO_BLOG_INDICE, JSON.stringify(posts, null, 2), 'utf8');
}
function slugBlog(texto){
  return slugificar(texto);
}

function regenerarIndice(){
  const produtos = listarProdutos();
  const resumo = produtos.map(p => ({
    id: p.id, slug: p.slug, nome: p.nome, categoria: p.categoria,
    preco: p.preco || null, imagens: p.imagens, badges: p.badges || [],
    tags: p.tags || [], status: p.status, dataCriacao: p.dataCriacao || ''
  }));
  fs.writeFileSync(CAMINHO_INDICE, JSON.stringify(resumo, null, 2), 'utf8');
  atualizarSitemap(produtos.filter(p => p.status === 'publicado'));
}

function atualizarSitemap(produtosPublicados){
  const base = 'https://www.turkfitness.com.br';
  const paginasFixas = [
    '/', '/catalogo.html', '/sobre-a-marca.html', '/contato.html', '/blog.html',
    '/como-cuidar-da-peca.html', '/faq.html', '/rastreie-seu-pedido.html',
    '/politica-de-envio-e-prazo-de-entrega.html', '/politica-de-troca-e-reembolso.html',
    '/politica-de-privacidade.html'
  ];
  const postsPublicados = listarPosts().filter(p => p.status === 'publicado');
  const urls = [
    ...paginasFixas.map(p => `  <url><loc>${base}${p}</loc></url>`),
    ...produtosPublicados.map(p => `  <url><loc>${base}/produto/${p.slug}.html</loc></url>`),
    ...postsPublicados.map(p => `  <url><loc>${base}/blog-post.html?slug=${encodeURIComponent(p.slug)}</loc></url>`)
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(CAMINHO_SITEMAP, xml, 'utf8');
}

function gerarPaginaProduto(slug){
  if(!fs.existsSync(CAMINHO_TEMPLATE_PRODUTO)){
    return { ok: false, motivo: 'Template produto/_template.html não encontrado.' };
  }
  const template = fs.readFileSync(CAMINHO_TEMPLATE_PRODUTO, 'utf8');
  const html = template.replace(/\{\{SLUG\}\}/g, slug);
  fs.writeFileSync(path.join(DIR_PRODUTO_PAGINAS, slug + '.html'), html, 'utf8');
  return { ok: true };
}

// Toda foto que entra pelo painel (produto, hero, categoria ou "sobre") sai
// sempre em .webp, redimensionada e comprimida — pensado pro Core Web
// Vitals do site: menos KB por imagem = LCP mais rápido, sem esforço manual
// da pessoa que está cadastrando o produto.
//   - resize 1200x1600 "inside": nunca aumenta foto pequena, só limita o
//     tamanho máximo (suficiente pra zoom de produto sem pesar demais).
//   - quality 82 + effort 6: o "effort" mais alto faz o encoder do WebP
//     gastar mais tempo de CPU procurando a compressão mais eficiente pro
//     mesmo nível de qualidade — arquivo menor, sem perda visível.
async function salvarImagemWebp(buffer, destino){
  await sharp(buffer)
    .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(destino);
}

// ---------- API: Blog ----------
app.get('/api/blog', (req, res) => {
  const posts = listarPosts()
    .filter(p => p.status === 'publicado')
    .sort((a,b) => (b.dataPublicacao || b.dataCriacao || '').localeCompare(a.dataPublicacao || a.dataCriacao || ''));
  res.json(posts);
});

app.get('/api/blog/admin', (req, res) => {
  res.json(listarPosts().sort((a,b) => (b.dataCriacao || '').localeCompare(a.dataCriacao || '')));
});

app.get('/api/blog/:slug', (req, res) => {
  const post = listarPosts().find(p => p.slug === req.params.slug);
  if(!post) return res.status(404).json({ erro:'Post não encontrado.' });
  if(post.status !== 'publicado' && !req.query.admin) return res.status(404).json({ erro:'Post não publicado.' });
  res.json(post);
});

app.post('/api/blog', upload.single('imagem'), async (req, res) => {
  try{
    garantirBlog();
    if(!req.body.titulo) return res.status(400).json({ erro:'Informe o título do post.' });
    const posts = listarPosts();
    const slug = slugBlog(req.body.slug || req.body.titulo);
    const existente = posts.find(p => p.slug === slug);
    const slugOriginal = req.body.slugOriginal || '';
    const antigo = slugOriginal ? posts.find(p => p.slug === slugOriginal) : null;
    if(existente && (!antigo || existente.slug !== antigo.slug)){
      return res.status(409).json({ erro:'Já existe um post com esse slug.' });
    }
    let imagem = req.body.imagemExistente || (antigo ? antigo.imagem || '' : '');
    if(req.file){
      fs.mkdirSync(DIR_ASSETS_BLOG, { recursive:true });
      const nomeArquivo = slug + '-' + Date.now() + '.webp';
      await salvarImagemWebp(req.file.buffer, path.join(DIR_ASSETS_BLOG, nomeArquivo));
      imagem = 'assets/blog/' + nomeArquivo;
    }
    const agora = new Date().toISOString();
    const post = {
      id: antigo ? antigo.id : 'post_' + Date.now().toString(36),
      slug, titulo: String(req.body.titulo).trim(),
      resumo: String(req.body.resumo || '').trim(),
      categoria: String(req.body.categoria || '').trim(),
      conteudo: String(req.body.conteudo || '').trim(),
      imagem, status: req.body.status || 'rascunho',
      dataCriacao: antigo ? antigo.dataCriacao : agora,
      dataPublicacao: req.body.dataPublicacao || (antigo ? antigo.dataPublicacao || '' : agora.slice(0,10))
    };
    const novos = antigo ? posts.map(p => p.slug === slugOriginal ? post : p) : posts.concat(post);
    salvarPosts(novos);
    atualizarSitemap(listarProdutos().filter(p => p.status === 'publicado'));
    res.json({ok:true, post});
  }catch(e){
    res.status(500).json({erro:'Erro ao salvar post: ' + e.message});
  }
});

app.delete('/api/blog/:slug', (req, res) => {
  const posts = listarPosts();
  const novos = posts.filter(p => p.slug !== req.params.slug);
  if(novos.length === posts.length) return res.status(404).json({erro:'Post não encontrado.'});
  salvarPosts(novos);
  atualizarSitemap(listarProdutos().filter(p => p.status === 'publicado'));
  res.json({ok:true});
});

// ---------- API: Produtos ----------

app.get('/api/produtos', (req, res) => {
  res.json(listarProdutos().sort((a, b) => (b.dataCriacao || '').localeCompare(a.dataCriacao || '')));
});

app.get('/api/produtos/:slug', (req, res) => {
  const caminho = path.join(DIR_PRODUTOS_JSON, req.params.slug + '.json');
  if(!fs.existsSync(caminho)) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json(JSON.parse(fs.readFileSync(caminho, 'utf8')));
});

// campos esperados (multipart/form-data):
// nome, categoria, descricaoCurta, descricaoCompleta, tecido, paisDeFabricacao,
// corNome, corHex, tamanhos (csv), precoValor, precoParcelamento, badges (csv),
// tags (csv), status, slugOriginal (se estiver editando), fotos (arquivos, 1-6)
app.post('/api/produtos', upload.array('fotos', 6), async (req, res) => {
  try{
    const corpo = req.body;
    if(!corpo.nome || !corpo.categoria){
      return res.status(400).json({ erro: 'Nome e categoria são obrigatórios.' });
    }
    const slug = slugificar(corpo.nome);
    const editando = corpo.slugOriginal && corpo.slugOriginal === slug;
    const caminhoJson = path.join(DIR_PRODUTOS_JSON, slug + '.json');

    if(!editando && corpo.slugOriginal && corpo.slugOriginal !== slug){
      // renomeou o produto: remove o arquivo antigo depois de criar o novo
    } else if(!editando && fs.existsSync(caminhoJson)){
      return res.status(409).json({ erro: 'Já existe um produto com esse nome (slug "' + slug + '"). Edite o produto existente em vez de criar um novo.' });
    }

    let produtoExistente = null;
    if(corpo.slugOriginal){
      const caminhoAntigo = path.join(DIR_PRODUTOS_JSON, corpo.slugOriginal + '.json');
      if(fs.existsSync(caminhoAntigo)) produtoExistente = JSON.parse(fs.readFileSync(caminhoAntigo, 'utf8'));
    }

    const arquivosImagens = [];
    const fotosEnviadas = req.files || [];
    for(let i = 0; i < fotosEnviadas.length; i++){
      const nomeArquivo = slug + (i === 0 ? '' : '-' + (i + 1)) + '.webp';
      await salvarImagemWebp(fotosEnviadas[i].buffer, path.join(DIR_ASSETS_PRODUTOS, nomeArquivo));
      arquivosImagens.push({ arquivo: nomeArquivo, alt: corpo.nome, proporcao: '3:4' });
    }
    const imagens = arquivosImagens.length ? arquivosImagens : (produtoExistente ? produtoExistente.imagens : []);
    if(!imagens.length){
      return res.status(400).json({ erro: 'Envie ao menos uma foto do produto.' });
    }

    const tamanhos = (corpo.tamanhos || '').split(',').map(s => s.trim()).filter(Boolean);
    const badges = (corpo.badges || '').split(',').map(s => s.trim()).filter(Boolean);
    const tags = (corpo.tags || '').split(',').map(s => s.trim()).filter(Boolean);

    const produto = {
      id: produtoExistente ? produtoExistente.id : gerarId(slug),
      slug,
      nome: corpo.nome,
      categoria: corpo.categoria,
      descricaoCurta: corpo.descricaoCurta || '',
      descricaoCompleta: corpo.descricaoCompleta || '',
      composicao: {
        tecido: corpo.tecido || '84% a 85% Poliamida e 15% a 16% Elastano',
        paisDeFabricacao: corpo.paisDeFabricacao || 'Brasil'
      },
      cores: [{
        nome: corpo.corNome || 'Única',
        hex: corpo.corHex || '#000000',
        imagens
      }],
      tamanhos: tamanhos.length ? tamanhos : ['P', 'M', 'G'],
      preco: corpo.precoValor ? { valor: parseFloat(corpo.precoValor), parcelamento: corpo.precoParcelamento || '' } : null,
      imagens,
      badges,
      tags,
      status: corpo.status || 'rascunho',
      dataCriacao: (produtoExistente && produtoExistente.dataCriacao) || new Date().toISOString().slice(0, 10)
    };

    fs.writeFileSync(caminhoJson, JSON.stringify(produto, null, 2), 'utf8');

    // se o slug mudou (nome editado), remove o json e a ficha antigos
    if(corpo.slugOriginal && corpo.slugOriginal !== slug){
      const antigoJson = path.join(DIR_PRODUTOS_JSON, corpo.slugOriginal + '.json');
      const antigaFicha = path.join(DIR_PRODUTO_PAGINAS, corpo.slugOriginal + '.html');
      if(fs.existsSync(antigoJson)) fs.unlinkSync(antigoJson);
      if(fs.existsSync(antigaFicha)) fs.unlinkSync(antigaFicha);
    }

    const resultadoPagina = gerarPaginaProduto(slug);
    regenerarIndice();

    res.json({ ok: true, produto, avisoPagina: resultadoPagina.ok ? null : resultadoPagina.motivo });
  } catch(erro){
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao salvar produto: ' + erro.message });
  }
});

app.delete('/api/produtos/:slug', (req, res) => {
  const slug = req.params.slug;
  const caminhoJson = path.join(DIR_PRODUTOS_JSON, slug + '.json');
  const caminhoFicha = path.join(DIR_PRODUTO_PAGINAS, slug + '.html');
  if(fs.existsSync(caminhoJson)) fs.unlinkSync(caminhoJson);
  if(fs.existsSync(caminhoFicha)) fs.unlinkSync(caminhoFicha);
  regenerarIndice();
  res.json({ ok: true });
});

// ---------- API: Fotos do site ----------

const SLOTS_FOTOS = [
  { chave: 'hero-look-01', pasta: DIR_ASSETS_HERO, arquivo: 'look-01.webp', rotulo: 'Home — vitrine, foto 1' },
  { chave: 'hero-look-02', pasta: DIR_ASSETS_HERO, arquivo: 'look-02.webp', rotulo: 'Home — vitrine, foto 2' },
  { chave: 'hero-look-03', pasta: DIR_ASSETS_HERO, arquivo: 'look-03.webp', rotulo: 'Home — vitrine, foto 3' },
  { chave: 'hero-look-04', pasta: DIR_ASSETS_HERO, arquivo: 'look-04.webp', rotulo: 'Home — vitrine, foto 4' },
  { chave: 'hero-look-05', pasta: DIR_ASSETS_HERO, arquivo: 'look-05.webp', rotulo: 'Home — vitrine, foto 5' },
  { chave: 'hero-look-06', pasta: DIR_ASSETS_HERO, arquivo: 'look-06.webp', rotulo: 'Home — vitrine, foto 6' },
  { chave: 'categoria-leggings', pasta: DIR_ASSETS_CATEGORIAS, arquivo: 'leggings.webp', rotulo: 'Home — card categoria Leggings' },
  { chave: 'categoria-tops', pasta: DIR_ASSETS_CATEGORIAS, arquivo: 'tops.webp', rotulo: 'Home — card categoria Tops' },
  { chave: 'categoria-conjuntos', pasta: DIR_ASSETS_CATEGORIAS, arquivo: 'conjuntos.webp', rotulo: 'Home — card categoria Conjuntos' },
  { chave: 'sobre-home-01', pasta: DIR_ASSETS_SOBRE, arquivo: 'estudio-01.webp', rotulo: 'Home — colagem "sobre", foto 1' },
  { chave: 'sobre-home-02', pasta: DIR_ASSETS_SOBRE, arquivo: 'estudio-02.webp', rotulo: 'Home — colagem "sobre", foto 2' },
  { chave: 'sobre-pagina-01', pasta: DIR_ASSETS_SOBRE, arquivo: 'marca-01.webp', rotulo: 'Sobre a Marca — foto 1' },
  { chave: 'sobre-pagina-02', pasta: DIR_ASSETS_SOBRE, arquivo: 'marca-02.webp', rotulo: 'Sobre a Marca — foto 2' }
];

app.get('/api/fotos', (req, res) => {
  const lista = SLOTS_FOTOS.map(s => ({
    chave: s.chave,
    rotulo: s.rotulo,
    arquivo: s.arquivo,
    enviada: fs.existsSync(path.join(s.pasta, s.arquivo))
  }));
  res.json(lista);
});

app.post('/api/fotos/:chave', upload.single('foto'), async (req, res) => {
  const slot = SLOTS_FOTOS.find(s => s.chave === req.params.chave);
  if(!slot) return res.status(404).json({ erro: 'Slot de foto desconhecido.' });
  if(!req.file) return res.status(400).json({ erro: 'Nenhuma foto enviada.' });
  try{
    if(!fs.existsSync(slot.pasta)) fs.mkdirSync(slot.pasta, { recursive: true });
    await salvarImagemWebp(req.file.buffer, path.join(slot.pasta, slot.arquivo));
    res.json({ ok: true });
  } catch(erro){
    res.status(500).json({ erro: 'Erro ao salvar foto: ' + erro.message });
  }
});

// ---------- boot ----------

if(!fs.existsSync(DIR_PRODUTOS_JSON)) fs.mkdirSync(DIR_PRODUTOS_JSON, { recursive: true });
regenerarIndice();

const PORTA = 3000;
app.listen(PORTA, () => {
  console.log('');
  console.log('Painel Turk Fitness rodando!');
  console.log('Abra no navegador: http://localhost:' + PORTA);
  console.log('Ver o site com o catálogo real: http://localhost:' + PORTA + '/site/catalogo.html');
  console.log('');
});
