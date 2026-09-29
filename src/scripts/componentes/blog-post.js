(function(){
  var el=document.getElementById('blog-post');
  if(!el) return;

  // Mesma convenção de src/scripts/utils/produtos.js: funciona tanto na
  // página antiga da raiz (blog-post.html, mantida só como redirecionamento)
  // quanto nas fichas estáticas dentro de /blog/.
  var BASE_RAIZ = /\/blog\//.test(window.location.pathname) ? '../' : '';

  var slug = new URLSearchParams(location.search).get('slug') || el.getAttribute('data-slug-inicial');
  if(!slug){ el.innerHTML='<p class="secao-texto">Post não encontrado.</p>'; return; }

  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function data(v){if(!v)return '';var d=new Date(v+'T00:00:00');return isNaN(d)?esc(v):d.toLocaleDateString('pt-BR');}

  // Conversor leve de "markdown" (## / ### / listas com "- " / parágrafos)
  // para HTML, aplicado SOBRE o texto já escapado — não introduz XSS.
  function renderizarConteudo(bruto){
    var linhas=esc(bruto).split(/\r?\n/);
    var html=''; var listaAberta=false;
    function fecharLista(){ if(listaAberta){ html+='</ul>'; listaAberta=false; } }
    linhas.forEach(function(linha){
      var l=linha.trim();
      if(l===''){ return; }
      if(l.slice(0,3)==='## '){ fecharLista(); html+='<h2>'+l.slice(3)+'</h2>'; return; }
      if(l.slice(0,4)==='### '){ fecharLista(); html+='<h3>'+l.slice(4)+'</h3>'; return; }
      if(l.slice(0,2)==='- '){
        if(!listaAberta){ html+='<ul>'; listaAberta=true; }
        html+='<li>'+l.slice(2)+'</li>';
        return;
      }
      fecharLista();
      html+='<p>'+l+'</p>';
    });
    fecharLista();
    return html;
  }

  // SEO (title, description, OG, canonical, JSON-LD) já vem pronto e correto
  // de forma estática em cada /blog/<slug>.html (ver painel-turkfitness/
  // seo-blog.js) — este script só preenche o conteúdo visível, sem mais
  // sobrescrever essas tags depois do carregamento.
  fetch(BASE_RAIZ+'src/content/blog/index.json?ts='+Date.now()).then(function(r){return r.json();}).then(function(posts){
    var p=(Array.isArray(posts)?posts:[]).find(function(x){return x.slug===slug && x.status==='publicado';});
    if(!p){el.innerHTML='<p class="secao-texto">Post não encontrado.</p>';return;}

    var breadcrumb=document.querySelector('.breadcrumb');
    if(breadcrumb){ breadcrumb.innerHTML='<a href="'+BASE_RAIZ+'index.html">Home</a><span>/</span><a href="'+BASE_RAIZ+'blog.html">Blog</a><span>/</span><span>'+esc(p.titulo)+'</span>'; }

    var urlImagem = p.imagem ? BASE_RAIZ+String(p.imagem).replace(/^\//,'') : '';

    el.innerHTML=
      '<div class="blog-post__meta">'+(p.categoria?esc(p.categoria)+' · ':'')+data(p.dataPublicacao)+'</div>'+
      '<h1>'+esc(p.titulo)+'</h1>'+
      (urlImagem?'<img class="blog-post__imagem" src="'+esc(urlImagem)+'" alt="'+esc(p.titulo)+'" loading="lazy">':'')+
      '<div class="blog-post__conteudo">'+renderizarConteudo(p.conteudo)+'</div>'+
      '<div class="blog-post__cta"><p>Gostou do conteúdo? Confira as peças da Turk Fitness.</p><a href="'+BASE_RAIZ+'catalogo.html" class="botao botao--primario">Ver catálogo</a></div>';
  }).catch(function(){el.innerHTML='<p class="secao-texto">Não foi possível carregar este conteúdo.</p>';});
})();
