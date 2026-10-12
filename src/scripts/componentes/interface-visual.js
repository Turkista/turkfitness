(function(){
  // Move o brilho com transform para evitar alterar left/top a cada movimento.
  var glow = document.getElementById('glow');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(glow){
    if(!reduce && window.matchMedia('(hover: hover) and (min-width: 701px)').matches){
      window.addEventListener('mousemove', function(e){
        glow.style.setProperty('--cursor-x', e.clientX + 'px');
        glow.style.setProperty('--cursor-y', e.clientY + 'px');
      }, { passive: true });
    } else {
      glow.style.display = 'none';
    }
  }

  // Atualiza o botão flutuante apenas quando cruza o limite de rolagem.
  var whats = document.querySelector('[data-whatsapp-flutuante]');
  if(whats){
    var tick = false;
    function verificarScroll(){
      var deveMostrar = window.scrollY > 200;
      if(deveMostrar !== whats.classList.contains('esta-visivel')){
        whats.classList.toggle('esta-visivel', deveMostrar);
      }
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
