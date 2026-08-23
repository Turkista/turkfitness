/* Utilitários compartilhados de produto — usados por catálogo, home e ficha.
   Lê sempre de src/content/produtos/index.json, o manifesto gerado
   automaticamente pelo Painel Turk Fitness a cada produto salvo. */
window.TurkFitProdutos = (function(){

  // Funciona tanto nas páginas da raiz (index.html, catalogo.html) quanto
  // nas fichas dentro de /produto/ — e também quando o site é servido sob um
  // prefixo (ex.: pré-visualização do painel em /site/...), já que o caminho
  // é relativo à página atual em vez de fixo a partir da raiz do domínio.
  var BASE_RAIZ = /\/produto\//.test(window.location.pathname) ? '../' : '';
  var CAMINHO_INDICE = BASE_RAIZ + 'src/content/produtos/index.json';

  function buscarIndice(){
    return fetch(CAMINHO_INDICE)
      .then(function(r){ if(!r.ok) throw new Error('indice indisponivel'); return r.json(); })
      .then(function(lista){ return lista.filter(function(p){ return p.status === 'publicado'; }); })
      .catch(function(){ return []; });
  }

  function buscarProduto(slug){
    return fetch(BASE_RAIZ + 'src/content/produtos/' + slug + '.json')
      .then(function(r){ if(!r.ok) throw new Error('produto nao encontrado'); return r.json(); });
  }

  function formatarPreco(preco){
    if(!preco || typeof preco.valor !== 'number') return null;
    return preco.valor.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  function linkWhatsApp(texto){
    var numero = '5521992197518';
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  return { buscarIndice: buscarIndice, buscarProduto: buscarProduto, formatarPreco: formatarPreco, linkWhatsApp: linkWhatsApp };
})();
