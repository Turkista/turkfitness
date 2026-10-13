# Sitemap e monitoramento do Google Search Console

## Geração local

O sitemap do TURKFITNESS é gerado a partir de \`src/content/produtos/index.json\` e \`src/content/blog/index.json\`. Somente conteúdos com \`status: publicado\` são considerados. O gerador verifica a existência do HTML, a URL canônica e a ausência de \`noindex\`.

Na raiz do repositório, execute:

\`\`\`bash
cd painel-turkfitness
npm run sitemap:generate
npm test
npm run sitemap:check
\`\`\`

A rotina de CI valida se \`sitemap.xml\` está sincronizado com os arquivos de conteúdo.

## Ativar envio e inspeção automatizados

O workflow \`.github/workflows/sitemap-search-console.yml\` pode ser executado manualmente ou semanalmente. Ele envia os dois sitemaps à API do Search Console, consulta o processamento do sitemap e inspeciona cada URL para criar um CSV com o estado retornado pela API. O envio é apenas uma solicitação de descoberta; não garante indexação.

1. No Google Cloud, crie uma conta de serviço e habilite a **Google Search Console API** para o projeto.
2. Adicione o e-mail da conta de serviço como proprietária das duas propriedades no Search Console. A propriedade precisa corresponder ao identificador configurado no workflow.
3. Em **Settings → Secrets and variables → Actions** deste repositório, crie o segredo \`GSC_SERVICE_ACCOUNT_JSON\` com o conteúdo completo do JSON da conta de serviço (não o publique em arquivos do repositório).
4. Opcionalmente, crie as variáveis \`GSC_PROPERTY_TURKISTA\` e \`GSC_PROPERTY_TURKFITNESS\` com o identificador exato da propriedade. Os padrões são as propriedades de prefixo de URL \`https://www.turkista.com.br/\` e \`https://www.turkfitness.com.br/\`. Para propriedades de domínio, use \`sc-domain:turkista.com.br\` e \`sc-domain:turkfitness.com.br\`.
5. Confirme que ambos os sites publicados servem o sitemap correspondente aos dados versionados. O workflow compara os conjuntos de URLs antes de enviar; se estiverem divergentes, ele para para evitar enviar uma versão antiga.
6. Em **Actions → Enviar sitemaps e monitorar indexação**, clique em **Run workflow**. O CSV é anexado como artefato ao final da execução.

A inspeção em massa usa a URL Inspection API e está sujeita às quotas do Google. O relatório distingue \`PASS\`, \`FAIL\` e erros de API; uma falha de inspeção não é uma solicitação de indexação manual. Para páginas não indexadas, investigue o estado e os motivos no relatório antes de pedir indexação individualmente.
