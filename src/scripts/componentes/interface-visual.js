(function(){
  // brilho que segue o cursor (mesmo efeito do padrão de marca)
  var glow = document.getElementById('glow');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(glow){
    if(!reduce){
      window.addEventListener('mousemove', function(e){
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
      });
    } else {
      glow.style.display = 'none';
    }
  }

  // botão flutuante do WhatsApp aparece após pequeno scroll
  var whats = document.querySelector('[data-whatsapp-flutuante]');
  if(whats){
    var tick = false;
    function verificarScroll(){
      if(window.scrollY > 200){ whats.classList.add('esta-visivel'); }
      tick = false;
    }
    window.addEventListener('scroll', function(){
      if(!tick){
        tick = true;
        window.requestAnimationFrame(verificarScroll);
      }
    }, { passive: true });
    window.requestAnimationFrame(verificarScroll);
  }
})();
