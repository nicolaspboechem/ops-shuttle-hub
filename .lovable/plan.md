

# Corrigir MIME type error no Vercel - Chunks JS servidos como HTML

## Problema

O `vercel.json` atual tem uma regra `"source": "/(.*)"` que redireciona **todas** as URLs para `index.html`, incluindo arquivos estáticos como `.js`, `.css`, `.woff2`.

Quando o Vercel faz um novo deploy, os hashes dos chunks mudam (ex: `AppMotorista-CRnTW4US.js` vira `AppMotorista-CItxCaYv.js`). Se o usuario esta com a aba aberta e navega para uma rota que carrega um chunk lazy, o browser pede o chunk antigo, que nao existe mais. O Vercel entao serve `index.html` (HTML) no lugar, causando o erro:

> Failed to load module script: server responded with MIME type "text/html"

## Solucao

Alterar o `vercel.json` para usar a configuracao padrao de SPAs no Vercel: redirecionar apenas rotas que **nao** correspondem a arquivos estaticos reais. O Vercel ja faz isso nativamente quando nao ha regra catch-all conflitante.

A configuracao correta exclui assets estaticos do rewrite, redirecionando apenas rotas de navegacao (sem extensao de arquivo) para `index.html`.

## Alteracao

### `vercel.json`

Substituir a regra atual por uma que exclua arquivos com extensao conhecida:

```json
{
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ]
}
```

Isso garante que qualquer URL dentro de `/assets/` (onde o Vite coloca os chunks JS/CSS) sera servida diretamente pelo Vercel como arquivo estatico. Rotas de navegacao como `/app/123/motorista` continuam sendo redirecionadas para `index.html` normalmente.

### Melhoria adicional no `lazyRetry` (App.tsx)

O `lazyRetry` atual tenta re-importar o chunk 3 vezes. Quando o erro e MIME type (chunk antigo apos deploy), nenhuma retry vai funcionar. Adicionar deteccao desse caso para forcar reload imediato da pagina (que carrega o novo `index.html` com os hashes corretos).

No `App.tsx`, dentro do `lazyRetry`, adicionar verificacao se o erro e de MIME type ou chunk nao encontrado, e nesse caso forcar `window.location.reload()` em vez de mostrar a tela de erro.

