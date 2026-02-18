

# Atualizar Favicon do Web App

## O que sera feito

1. Copiar a imagem enviada (`logo_mais_redzida_branca_as.png`) para `public/favicon.png`
2. Atualizar o `index.html` para referenciar o novo favicon local em vez da URL externa do Google Storage
3. Atualizar o `manifest.json` para incluir o icone no array de icons (para PWA)

## Detalhes tecnicos

### Arquivo: `index.html`
- Trocar a tag `<link rel="icon">` atual (que aponta para `storage.googleapis.com/...`) para `<link rel="icon" type="image/png" href="/favicon.png">`

### Arquivo: `public/manifest.json`
- Adicionar o icone ao array `icons` para que o PWA tambem use o novo icone

### Arquivos alterados: 2
- `index.html`
- `public/manifest.json`

