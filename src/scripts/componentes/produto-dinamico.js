(function(){
  var raiz = document.querySelector('[data-produto-raiz]');
  if(!raiz) return;

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug') || raiz.getAttribute('data-slug-inicial');
  if(!slug){
    raiz.innerHTML = '<p class="aviso-catalogo">Produto não informado.</p>';
    return;
  }

  var categoriaLabel = { legging:'Legging', top:'Top', conjunto:'Conjunto', short:'Short', regata:'Regata', jaqueta:'Jaqueta', acessorio:'Acessório' };
  var badgeLabel = { novo:'Novo', exclusivo:'Exclusivo', 'ultimas-unidades':'Últimas unidades', reposicao:'Reposição' };

  function el(html){
    var div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  TurkFitProdutos.buscarProduto(slug).then(function(p){
    document.title = p.nome + ' — Turk Fitness';
    var metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc) metaDesc.setAttribute('content', p.descricaoCurta || '');

    var corInicial = p.cores && p.cores[0];
    var imagensBase = (corInicial && corInicial.imagens && corInicial.imagens.length) ? corInicial.imagens : p.imagens;
    var preco = TurkFitProdutos.formatarPreco(p.preco);

    // SEO dinâmico — a ficha é servida a partir de um template único,
    // então título/OG/Twitter/canonical só ficam corretos depois do fetch.
    var urlAbsolutaImagem = imagensBase && imagensBase[0]
      ? 'https://www.turkfitness.com.br/assets/produtos/' + imagensBase[0].arquivo
      : 'https://www.turkfitness.com.br/assets/hero/look-01.webp';
    var urlAbsolutaPagina = 'https://www.turkfitness.com.br/produto/' + p.slug + '.html';
    var descricaoSeo = p.descricaoCurta || p.descricaoCompleta || '';
    [
      ['meta[property="og:title"]', 'content', p.nome + ' — Turk Fitness'],
      ['meta[property="og:description"]', 'content', descricaoSeo],
      ['meta[property="og:url"]', 'content', urlAbsolutaPagina],
      ['meta[property="og:image"]', 'content', urlAbsolutaImagem],
      ['meta[name="twitter:title"]', 'content', p.nome + ' — Turk Fitness'],
      ['meta[name="twitter:description"]', 'content', descricaoSeo],
      ['meta[name="twitter:image"]', 'content', urlAbsolutaImagem],
      ['link[rel="canonical"]', 'href', urlAbsolutaPagina],
    ].forEach(function(par){
      var elemento = document.querySelector(par[0]);
      if(elemento) elemento.setAttribute(par[1], par[2]);
    });

    var badgesHtml = (p.badges || []).map(function(b){ return '<span class="produto-badge">' + (badgeLabel[b] || b) + '</span>'; }).join('');

    var galeriaMiniaturas = imagensBase.map(function(img, i){
      return '<button data-thumb data-src="../assets/produtos/' + img.arquivo + '" class="' + (i===0?'esta-ativa':'') + '"><img src="../assets/produtos/' + img.arquivo + '" alt="' + img.alt + '" loading="lazy" decoding="async"></button>';
    }).join('');

    var coresHtml = (p.cores || []).map(function(c, i){
      return '<button data-cor="' + i + '" title="' + c.nome + '" class="' + (i===0?'esta-ativa':'') + '" style="background:' + c.hex + '"></button>';
    }).join('');

    var tamanhosHtml = (p.tamanhos || []).map(function(t){
      return '<button data-tamanho="' + t + '">' + t + '</button>';
    }).join('');

    var fichaHtml = '<dl>' +
      (p.composicao && p.composicao.tecido ? '<dt>Tecido</dt><dd>' + p.composicao.tecido + '</dd>' : '') +
      (p.composicao && p.composicao.paisDeFabricacao ? '<dt>Fabricação</dt><dd>' + p.composicao.paisDeFabricacao + '</dd>' : '') +
      '</dl>';

    raiz.innerHTML =
      '<nav class="breadcrumb" aria-label="Breadcrumb">' +
        '<a href="../index.html">Home</a><span aria-hidden="true">/</span>' +
        '<a href="../catalogo.html">Catálogo</a><span aria-hidden="true">/</span>' +
        '<span aria-current="page">' + p.nome + '</span>' +
      '</nav>' +
      '<div class="produto-grid">' +
        '<div class="produto-galeria">' +
          '<div class="produto-galeria__principal"><img data-imagem-principal src="../assets/produtos/' + imagensBase[0].arquivo + '" alt="' + imagensBase[0].alt + '" loading="eager" decoding="async" fetchpriority="high"></div>' +
          '<div class="produto-galeria__miniaturas">' + galeriaMiniaturas + '</div>' +
        '</div>' +
        '<div class="produto-info">' +
          (badgesHtml ? '<div class="produto-badges">' + badgesHtml + '</div>' : '') +
          '<span class="produto-info__categoria">' + (categoriaLabel[p.categoria] || p.categoria) + ' · Turk Fitness</span>' +
          '<h1>' + p.nome + '</h1>' +
          '<p class="produto-info__preco">' + (preco || 'Consulte o valor no WhatsApp') + '</p>' +
          '<p class="produto-info__descricao">' + (p.descricaoCompleta || p.descricaoCurta || '') + '</p>' +
          (coresHtml ? '<div class="produto-secao-escolha"><h3>Cor — <span data-nome-cor>' + p.cores[0].nome + '</span></h3><div class="produto-cores">' + coresHtml + '</div></div>' : '') +
          (tamanhosHtml ? '<div class="produto-secao-escolha"><h3>Tamanho</h3><div class="produto-tamanhos">' + tamanhosHtml + '</div></div>' : '') +
          '<div class="produto-acoes">' +
            '<button type="button" class="botao botao--primario" data-adicionar-carrinho' +
              ' data-slug="' + p.slug + '" data-nome="' + p.nome + '" data-categoria="' + (p.categoria || '') + '"' +
              (p.preco && typeof p.preco.valor === 'number' ? ' data-preco="' + p.preco.valor + '"' : '') +
              ' data-tamanho="" data-cor="' + (corInicial ? corInicial.nome : '') + '">Adicionar ao carrinho</button>' +
            '<a class="botao botao--whatsapp" data-link-whatsapp target="_blank" rel="noopener">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.83 14.02c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.71-.83.9-1.11.19-.29.38-.24.63-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.34.07.13.07.71-.17 1.39z"/></svg>' +
              'Comprar pelo WhatsApp' +
            '</a>' +
          '</div>' +
          (fichaHtml.indexOf('<dt>') > -1 ? '<div class="produto-ficha">' + fichaHtml + '</div>' : '') +
        '</div>' +
      '</div>';

    // troca de imagem principal via miniatura
    raiz.querySelectorAll('[data-thumb]').forEach(function(btn){
      btn.addEventListener('click', function(){
        raiz.querySelectorAll('[data-thumb]').forEach(function(b){ b.classList.remove('esta-ativa'); });
        btn.classList.add('esta-ativa');
        raiz.querySelector('[data-imagem-principal]').src = btn.getAttribute('data-src');
      });
    });

    // troca de cor: atualiza galeria se a cor tiver fotos próprias
    var tamanhoSelecionado = null;
    var corSelecionadaIdx = 0;
    var botaoCarrinho = raiz.querySelector('[data-adicionar-carrinho]');
    var temTamanhos = !!(p.tamanhos && p.tamanhos.length);

    raiz.querySelectorAll('[data-cor]').forEach(function(btn){
      btn.addEventListener('click', function(){
        raiz.querySelectorAll('[data-cor]').forEach(function(b){ b.classList.remove('esta-ativa'); });
        btn.classList.add('esta-ativa');
        corSelecionadaIdx = parseInt(btn.getAttribute('data-cor'), 10);
        var cor = p.cores[corSelecionadaIdx];
        var nomeCorEl = raiz.querySelector('[data-nome-cor]');
        if(nomeCorEl) nomeCorEl.textContent = cor.nome;
        if(cor.imagens && cor.imagens.length){
          raiz.querySelector('[data-imagem-principal]').src = '../assets/produtos/' + cor.imagens[0].arquivo;
        }
        if(botaoCarrinho) botaoCarrinho.setAttribute('data-cor', cor.nome || '');
        atualizarLinkWhats();
      });
    });

    raiz.querySelectorAll('[data-tamanho]').forEach(function(btn){
      btn.addEventListener('click', function(){
        raiz.querySelectorAll('[data-tamanho]').forEach(function(b){ b.classList.remove('esta-ativa'); });
        btn.classList.add('esta-ativa');
        tamanhoSelecionado = btn.getAttribute('data-tamanho');
        if(botaoCarrinho){
          botaoCarrinho.setAttribute('data-tamanho', tamanhoSelecionado || '');
          var seletorTamanho = raiz.querySelector('.produto-tamanhos');
          if(seletorTamanho) seletorTamanho.classList.remove('produto-tamanhos--erro');
        }
        atualizarLinkWhats();
      });
    });

    // Adicionar ao carrinho exige tamanho, quando a peça tiver tamanhos —
    // roda antes do listener global de carrinho-ui.js (delegado no document,
    // então dispara depois deste, na fase de bolha).
    if(botaoCarrinho && temTamanhos){
      botaoCarrinho.addEventListener('click', function(evento){
        if(!botaoCarrinho.getAttribute('data-tamanho')){
          evento.preventDefault();
          evento.stopPropagation();
          var seletorTamanho = raiz.querySelector('.produto-tamanhos');
          if(seletorTamanho) seletorTamanho.classList.add('produto-tamanhos--erro');
          alert('Escolha um tamanho antes de adicionar ao carrinho.');
        }
      });
    }

    function atualizarLinkWhats(){
      var cor = p.cores && p.cores[corSelecionadaIdx];
      var partes = ['Oi! Tenho interesse na peça "' + p.nome + '"'];
      if(cor) partes.push('cor ' + cor.nome);
      if(tamanhoSelecionado) partes.push('tamanho ' + tamanhoSelecionado);
      var link = raiz.querySelector('[data-link-whatsapp]');
      if(link) link.href = TurkFitProdutos.linkWhatsApp(partes.join(', ') + '.');
    }
    atualizarLinkWhats();

  }).catch(function(){
    raiz.innerHTML = '<p class="aviso-catalogo">Não encontramos essa peça. Ela pode ter sido removida ou o link está incorreto. <a href="../catalogo.html" style="color:var(--mint)">Voltar ao catálogo</a>.</p>';
  });
})();
