

# Service Worker + Reducao de Chunks para 4G

## Resumo

O Service Worker (`public/sw.js`) ja foi criado. Faltam 3 passos para completar a otimizacao:

1. **Registrar o Service Worker** no `src/main.tsx`
2. **Criar o manifest PWA** e linkar no `index.html`
3. **Consolidar chunks** de 7 para 3 no `vite.config.ts`

---

## Alteracoes

### 1. src/main.tsx - Registrar Service Worker

Adicionar apos o `createRoot().render()`:

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
```

### 2. public/manifest.json - Criar manifest PWA

```json
{
  "name": "CCO AS BRASIL",
  "short_name": "CCO",
  "start_url": "/login/motorista",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": []
}
```

### 3. index.html - Linkar manifest

Adicionar dentro do `<head>`:

```html
<link rel="manifest" href="/manifest.json">
```

### 4. vite.config.ts - Consolidar 7 chunks em 3

Substituir os 7 `manualChunks` atuais por 3:

```typescript
manualChunks: {
  'vendor-core': [
    'react', 'react-dom', 'react-router-dom',
    '@tanstack/react-query',
    'clsx', 'tailwind-merge', 'zod', 'date-fns'
  ],
  'vendor-ui': [
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-popover',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
    '@radix-ui/react-tooltip',
    'framer-motion',
  ],
  'vendor-services': [
    '@supabase/supabase-js',
    'recharts',
  ],
},
```

---

## Impacto esperado

| Metrica | Antes | Depois |
|---|---|---|
| Primeiro acesso (4G) | ~10s | ~6s (3 chunks vs 7) |
| Segundo acesso (4G) | ~10s | Menos de 1s (cache local) |
| Requests paralelos | 7+ vendor chunks | 3 vendor chunks |

A maior vitoria: apos o primeiro acesso, o motorista abre o app do cache local sem buscar nada no servidor. Isso resolve a tela branca no dia-a-dia.

