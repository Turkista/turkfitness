(function(){
  var grade = document.querySelector('[data-grade-produtos]');
  if(!grade) return;
  var vazio = document.querySelector('[data-catalogo-vazio]');
  var botoesFiltro = document.querySelectorAll('[data-filtro-categoria]');
  var campoBusca = document.querySelector('[data-catalogo-busca]');

  var todos = [];
  var categoriaAtiva = 'todas';
  var termoBusca = '';

  function categoriaLabel(cat){
    var mapa = { legging:'Legging', top:'Top', conjunto:'Conjunto', short:'Short', regata:'Regata', jaqueta:'Jaqueta', acessorio:'Acessório' };
    return mapa[cat] || cat;
  }

  function cardHtml(p){
    var img = (p.imagens && p.imagens[0]) ? 'assets/produtos/' + p.imagens[0].arquivo : '';
    var alt = (p.imagens && p.imagens[0] && p.imagens[0].alt) || p.nome;
    var preco = TurkFitProdutos.formatarPreco(p.preco);
    var badge = (p.badges && p.badges[0]) ? '<span class="card-produto__badge">' + (p.badges[0] === 'novo' ? 'Novo' : p.badges[0]) + '</span>' : '';
    // Só entra direto no carrinho quem tem preço cadastrado — sem preço,
    // o caminho continua sendo "Ver produto" → falar no WhatsApp.
    var botaoAdicionarHtml = (p.preco && typeof p.preco.valor === 'number')
      ? '<button class="card-produto__adicionar" data-adicionar-carrinho' +
          ' data-slug="' + p.slug + '" data-nome="' + p.nome + '" data-categoria="' + p.categoria + '"' +
          ' data-preco="' + p.preco.valor + '">Adicionar ao carrinho</button>'
      : '';
    return '' +
      '<div class="card-produto" data-categoria-produto="' + p.categoria + '">' +
        '<a href="produto/' + p.slug + '.html" class="card-produto__link-completo">' +
          '<div class="card-produto__imagem">' + badge +
            (img ? '<img src="' + img + '" alt="' + alt + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' : '') +
            '<span class="card-produto__categoria">' + categoriaLabel(p.categoria) + '</span>' +
          '</div>' +
          '<div class="card-produto__corpo">' +
            '<h3 class="card-produto__nome">' + p.nome + '</h3>' +
            '<p class="card-produto__preco' + (preco ? '' : ' card-produto__preco--indisponivel') + '">' + (preco || 'Consulte no WhatsApp') + '</p>' +
            '<span class="card-produto__link">Ver produto <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' +
          '</div>' +
        '</a>' +
        botaoAdicionarHtml +
      '</div>';
  }

  function renderizar(){
    var filtrados = todos.filter(function(p){
      var passaCategoria = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
      var passaBusca = !termoBusca || (p.nome + ' ' + (p.tags||[]).join(' ')).toLowerCase().indexOf(termoBusca) > -1;
      return passaCategoria && passaBusca;
    });
    grade.innerHTML = filtrados.map(cardHtml).join('');
    if(vazio) vazio.style.display = filtrados.length ? 'none' : 'block';
  }

  botoesFiltro.forEach(function(botao){
    botao.addEventListener('click', function(){
      botoesFiltro.forEach(function(b){ b.setAttribute('aria-pressed','false'); });
      botao.setAttribute('aria-pressed','true');
      categoriaAtiva = botao.getAttribute('data-filtro-categoria');
      renderizar();
    });
  });

  if(campoBusca){
    campoBusca.addEventListener('input', function(){
      termoBusca = campoBusca.value.trim().toLowerCase();
      renderizar();
    });
  }

  // ativa a categoria vinda da hash da URL (ex.: catalogo.html#legging)
  function aplicarCategoriaDaHash(){
    var hash = window.location.hash.replace('#','');
    var alvo = hash ? document.querySelector('[data-filtro-categoria="' + hash + '"]') : document.querySelector('[data-filtro-categoria="todas"]');
    if(alvo) alvo.click();
  }
  aplicarCategoriaDaHash();

  // clicar em um link de categoria (menu, rodapé) enquanto já se está no
  // catálogo só muda a âncora da URL — sem isso, nada reagia ao clique
  window.addEventListener('hashchange', aplicarCategoriaDaHash);

  TurkFitProdutos.buscarIndice().then(function(lista){
    todos = lista;
    renderizar();
  });
})();
