(function(){
  var vitrine = document.querySelector('[data-vitrine-novidades]');
  if(!vitrine) return;

  function cardHtml(p){
    var img = (p.imagens && p.imagens[0]) ? 'assets/produtos/' + p.imagens[0].arquivo : '';
    var alt = (p.imagens && p.imagens[0] && p.imagens[0].alt) || p.nome;
    var preco = TurkFitProdutos.formatarPreco(p.preco);
    var botaoAdicionarHtml = (p.preco && typeof p.preco.valor === 'number')
      ? '<button class="card-produto__adicionar" data-adicionar-carrinho' +
          ' data-slug="' + p.slug + '" data-nome="' + p.nome + '" data-categoria="' + p.categoria + '"' +
          ' data-preco="' + p.preco.valor + '">Adicionar ao carrinho</button>'
      : '';
    return '' +
      '<div class="card-produto">' +
        '<a href="produto/' + p.slug + '.html" class="card-produto__link-completo">' +
          '<div class="card-produto__imagem">' +
            (img ? '<img src="' + img + '" alt="' + alt + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' : '') +
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

  TurkFitProdutos.buscarIndice().then(function(lista){
    var recentes = lista.slice().sort(function(a,b){ return (b.dataCriacao||'').localeCompare(a.dataCriacao||''); }).slice(0,4);
    if(!recentes.length){
      vitrine.innerHTML = '<p class="aviso-catalogo">As primeiras peças aparecem aqui assim que forem cadastradas no Painel Turk Fitness.</p>';
      return;
    }
    vitrine.innerHTML = recentes.map(cardHtml).join('');
  });
})();
