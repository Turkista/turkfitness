# Turk Fitness — Site + Painel

Site institucional/showroom da **Turk Fitness** — moda academia, parte da família
**Turkista**. HTML/CSS/JS estático (sem framework), no mesmo padrão técnico do site
da Turkista, com um painel local (Node/Express) que cadastra produtos e fotos sem
precisar mexer em código.

## Como ver o site

**Jeito mais fácil — pelo painel (recomendado):**
Dê duplo clique em `abrir-painel.bat` (Windows) ou `abrir-painel.command` (Mac).
Ele instala as dependências na primeira vez, sobe o painel e abre
`http://localhost:3000` sozinho. O link **"Ver o site →"** no topo do painel leva
ao site completo, já com o catálogo real.

**Sem o painel, só pra olhar o layout:**
```bash
python3 -m http.server 8000
# depois abrir http://localhost:8000/catalogo.html
```
⚠️ Não abra os `.html` direto do disco (duplo clique) — `catalogo.html`,
`index.html` e as fichas de produto buscam os dados reais com `fetch()`, e o
navegador bloqueia isso em `file://...`. Sempre sirva por `http://`.

## Estrutura

```
index.html, catalogo.html, sobre-a-marca.html, contato.html   páginas do site
produto/_template.html      molde da ficha de produto (o painel clona isso)
produto/<slug>.html         fichas geradas automaticamente pelo painel

assets/produtos/            fotos de produto (.webp) — geridas pelo painel
assets/hero/                fotos da vitrine da Home (look-01..06)
assets/categorias/          fotos dos 3 cards de categoria da Home
assets/sobre/                fotos institucionais (Home + Sobre a Marca)
                             cada pasta tem um README.md com os nomes exatos esperados

src/styles/tokens/          cores, tipografia, espaçamento — fonte única da verdade
src/styles/base/            reset e fundo (grid, blobs, brilho de cursor)
src/styles/componentes/     header, footer, botões, cards, filtros, whatsapp
src/pages/                  CSS específico de cada página (home, catálogo, produto)
src/scripts/                JS: menu mobile, catálogo dinâmico, ficha dinâmica
src/schema/produto.schema.json   schema de produto (referência, não é validado em runtime)
src/content/produtos/       um .json por produto + index.json (manifesto, gerado pelo painel)

painel-turkfitness/         painel local (Node/Express) — ver README dentro da pasta
```

## O painel

Veja `painel-turkfitness/README.md` para o passo a passo completo. Resumo: ele tem
duas abas —

- **🏋️ Produtos** — formulário completo (nome, categoria, tecido, cor, tamanhos,
  preço, selos, tags, status, fotos). Ao salvar: converte as fotos pra `.webp`,
  salva em `assets/produtos/`, gera o `.json` em `src/content/produtos/`, gera a
  ficha (`produto/<slug>.html`) a partir do template, atualiza o manifesto
  (`index.json`) e o `sitemap.xml`. Se o status for "Publicado", a peça entra
  sozinha no Catálogo e, se for recente, na Home.
- **📸 Fotos do Site** — todos os "slots" de foto institucional que a Home e a
  página Sobre esperam (vitrine, cards de categoria, colagens). Escolher a foto já
  salva com o nome certo, na pasta certa, convertida pra `.webp`.

## O que é diferente do site da Turkista (original)

- Uma linha só (moda academia) — por isso não existe mais o campo **"linha"**
  (Praia/Surf/Turk Fit) no produto; só **categoria** (legging, top, conjunto,
  short, regata, jaqueta, acessório).
- Fichas de produto são geradas a partir de um único template
  (`produto/_template.html`) que lê os dados via `fetch()` no navegador — mais
  simples de manter que gerar HTML estático completo por peça, e não depende de
  Python instalado (o painel original usava scripts `.py` pra isso).
- Blog e política de troca/privacidade não foram replicados nesta primeira
  versão, pra focar no catálogo — dá pra adicionar depois no mesmo padrão.
- As 6 fotos em `assets/hero/` vieram do material de referência que você
  enviou (o "em breve" do Turk Fitness) — troque pelas fotos reais da coleção
  quando tiver, mantendo os mesmos nomes de arquivo.

## Stack

HTML5 + CSS3 (custom properties / design tokens) + JavaScript puro (sem
dependências) no site. Painel em Node.js + Express + Multer (upload) + Sharp
(conversão de imagem pra `.webp`). Google Fonts (Playfair Display + Poppins +
Space Mono) via CDN — mesma paleta escura (mint/lavanda/rosa/azul) do material
de referência da marca.
