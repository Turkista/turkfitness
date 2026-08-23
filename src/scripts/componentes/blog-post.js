(function(){
  var el=document.getElementById('blog-post');
  var slug=new URLSearchParams(location.search).get('slug');
  if(!slug){el.innerHTML='<p class="secao-texto">Post não encontrado.</p>';return;}

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

  function definirMeta(nome, conteudo, propriedade){
    var seletor = propriedade ? 'meta[property="'+nome+'"]' : 'meta[name="'+nome+'"]';
    var tag=document.querySelector(seletor);
    if(!tag){
      tag=document.createElement('meta');
      if(propriedade){ tag.setAttribute('property', nome); } else { tag.setAttribute('name', nome); }
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', conteudo);
  }

  fetch('src/content/blog/index.json?ts='+Date.now()).then(function(r){return r.json();}).then(function(posts){
    var p=(Array.isArray(posts)?posts:[]).find(function(x){return x.slug===slug && x.status==='publicado';});
    if(!p){el.innerHTML='<p class="secao-texto">Post não encontrado.</p>';return;}

    document.title=p.titulo+' — Blog Turk Fitness';
    definirMeta('description', p.resumo||'');
    definirMeta('og:title', p.titulo, true);
    definirMeta('og:description', p.resumo||'', true);
    if(p.imagem){ definirMeta('og:image', location.origin+'/'+p.imagem.replace(/^\//,''), true); }
    var linkCanonico=document.querySelector('link[rel="canonical"]');
    if(!linkCanonico){ linkCanonico=document.createElement('link'); linkCanonico.setAttribute('rel','canonical'); document.head.appendChild(linkCanonico); }
    linkCanonico.setAttribute('href', location.origin+'/blog-post.html?slug='+encodeURIComponent(p.slug));

    var breadcrumb=document.querySelector('.breadcrumb');
    if(breadcrumb){ breadcrumb.innerHTML='<a href="index.html">Home</a><span>/</span><a href="blog.html">Blog</a><span>/</span><span>'+esc(p.titulo)+'</span>'; }

    el.innerHTML=
      '<div class="blog-post__meta">'+(p.categoria?esc(p.categoria)+' · ':'')+data(p.dataPublicacao)+'</div>'+
      '<h1>'+esc(p.titulo)+'</h1>'+
      (p.imagem?'<img class="blog-post__imagem" src="'+esc(p.imagem)+'" alt="'+esc(p.titulo)+'" loading="lazy">':'')+
      '<div class="blog-post__conteudo">'+renderizarConteudo(p.conteudo)+'</div>'+
      '<div class="blog-post__cta"><p>Gostou do conteúdo? Confira as peças da Turk Fitness.</p><a href="catalogo.html" class="botao botao--primario">Ver catálogo</a></div>';
  }).catch(function(){el.innerHTML='<p class="secao-texto">Não foi possível carregar este conteúdo.</p>';});
})();
