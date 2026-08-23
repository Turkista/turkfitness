# src/content/produtos/

Um arquivo `.json` por produto (schema em `src/schema/produto.schema.json`),
gerado automaticamente pelo **Painel Turk Fitness** (aba Produtos).

`index.json` é o manifesto: uma lista com o resumo de todos os produtos,
regerado a cada produto salvo. É esse arquivo que `catalogo.html` e
`index.html` buscam com `fetch()` para montar a vitrine — por isso o site
precisa ser servido por `http://` (ver README raiz), nunca aberto direto
do disco (`file://`).

Não edite `index.json` manualmente — ele é sobrescrito pelo painel.
