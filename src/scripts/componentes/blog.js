(function(){
  var lista=document.getElementById('blog-lista');
  var vazio=document.getElementById('blog-vazio');
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function data(v){if(!v)return ''; var d=new Date(v+'T00:00:00'); return isNaN(d)?esc(v):d.toLocaleDateString('pt-BR');}
  fetch('src/content/blog/index.json?ts='+Date.now())
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(posts){
      posts=(Array.isArray(posts)?posts:[]).filter(function(p){return p.status==='publicado';})
        .sort(function(a,b){return String(b.dataPublicacao||b.dataCriacao).localeCompare(String(a.dataPublicacao||a.dataCriacao));});
      if(!posts.length){vazio.hidden=false;return;}
      vazio.hidden=true;
      lista.innerHTML=posts.map(function(p){
        return '<a class="blog-card" href="blog-post.html?slug='+encodeURIComponent(p.slug)+'">'+
          (p.imagem?'<div class="blog-card__imagem"><img src="'+esc(p.imagem)+'" alt="'+esc(p.titulo)+'" loading="lazy"></div>':'')+
          '<div class="blog-card__corpo">'+
          '<div class="blog-card__data">'+(p.categoria?esc(p.categoria)+' · ':'')+data(p.dataPublicacao)+'</div>'+
          '<h2>'+esc(p.titulo)+'</h2><p>'+esc(p.resumo)+'</p>'+
          '<span class="blog-card__leia-mais">Leia mais &rarr;</span>'+
          '</div></a>';
      }).join('');
    })
    .catch(function(){vazio.hidden=false;vazio.textContent='Não foi possível carregar o Blog agora.';});
})();
