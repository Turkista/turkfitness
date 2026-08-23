# Painel Turk Fitness

Painel local com duas abas — cadastre produtos e envie fotos institucionais,
tudo sem mexer em código. Roda no seu computador, não depende de internet
(depois de instalado) e não sobe nada pra fora do seu computador.

## Como usar (primeira vez)

1. Abra a pasta **`turkfitness-site`** inteira no VS Code (não só a pasta
   `painel-turkfitness`).
2. Abra o terminal integrado (menu **Terminal → Novo Terminal**, ou `` Ctrl+` ``).
3. Entre na pasta do painel e instale as dependências (só precisa fazer isso
   uma vez):
   ```
   cd painel-turkfitness
   npm install
   ```
4. Inicie o painel:
   ```
   npm start
   ```
5. Vai aparecer:
   ```
   Painel Turk Fitness rodando!
   Abra no navegador: http://localhost:3000
   Ver o site com o catálogo real: http://localhost:3000/site/catalogo.html
   ```
6. Copie esse link e cole no navegador.

Da próxima vez, só os passos 4 e 5 (não precisa `npm install` de novo, a menos
que eu avise que atualizei alguma dependência).

## Aba 🏋️ Produtos

Preencha nome, categoria, ficha técnica, cor, tamanhos, preço, selos, tags e
status, e envie as fotos (a primeira é a capa do card do catálogo). Ao salvar:

- As fotos são convertidas pra `.webp` e salvas em `../assets/produtos/`
- Gera o `.json` do produto em `../src/content/produtos/`, a partir do schema
  em `../src/schema/produto.schema.json`
- Gera automaticamente a ficha de produto (`../produto/<slug>.html`)
- Atualiza o manifesto (`index.json`) e o `sitemap.xml`
- Se o status for "Publicado": entra sozinho no Catálogo e, se estiver entre
  os mais recentes, na Home também

**Editar um produto já cadastrado:** clique em "Editar" na tabela — o
formulário é preenchido automaticamente. Se você mudar o nome, o painel gera
um novo slug e remove os arquivos antigos.

**Excluir:** clique em "Excluir" na tabela — remove o `.json`, a ficha, e
atualiza catálogo/sitemap. As fotos em `assets/produtos/` não são apagadas
automaticamente (por segurança), pode remover manualmente se quiser.

## Aba 📸 Fotos do Site

Lista todos os "slots" de foto institucional que o site espera (vitrine da
Home, cards de categoria, colagens). Basta escolher a foto — ela já é salva
com o nome e na pasta exatos, convertida pra `.webp`. Mostra quais já foram
enviadas.

## Como pré-visualizar o site

**Não abra `index.html`, `catalogo.html` etc. direto do disco (duplo
clique).** Eles buscam produtos reais com `fetch()`, e o navegador bloqueia
isso em `file://...` — o site abre, mas mostra vazio.

Com o painel rodando (`npm start`), o site inteiro fica disponível em
`http://localhost:3000/site/`:
- `http://localhost:3000/site/index.html`
- `http://localhost:3000/site/catalogo.html`
- `http://localhost:3000/site/produto/<slug>.html`

## Observações

- **Uma cor por cadastro nesta versão.** Se uma peça tiver mais de uma cor,
  cadastre com a primeira e ajuste o `.json` gerado depois pra incluir as
  demais (mesma limitação do painel original da Turkista).
- **Status "rascunho"** é o padrão — fica salvo, mas só aparece no site
  publicado quando você mudar pra "Publicado".
- Se o nome do produto gerar um slug que já existe, o painel avisa e não
  deixa criar um duplicado sem querer — nesse caso, edite o produto existente.

## Se der erro ao instalar (`npm install`)

Esse painel usa uma biblioteca (`sharp`) que faz a conversão das fotos — ela
baixa um componente extra na primeira instalação. Se der erro, o mais comum é
falta de conexão com a internet nesse momento (só na instalação, não no uso
do dia a dia). Rode `npm install` de novo com internet ativa.

## Para parar o painel

Clique no terminal e aperte `Ctrl+C`.
