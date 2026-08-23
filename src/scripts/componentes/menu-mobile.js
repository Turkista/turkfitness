(function(){
  var botaoAbrir = document.querySelector('[data-menu-abrir]');
  var botaoFechar = document.querySelector('[data-menu-fechar]');
  var menu = document.querySelector('[data-menu-mobile]');
  if(!botaoAbrir || !menu) return;

  function abrir(){
    menu.classList.add('esta-aberto');
    botaoAbrir.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function fechar(){
    menu.classList.remove('esta-aberto');
    botaoAbrir.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  botaoAbrir.addEventListener('click', abrir);
  if(botaoFechar) botaoFechar.addEventListener('click', fechar);
  menu.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', fechar); });
})();
