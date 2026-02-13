

# Correcao definitiva: Tela branca em redes moveis (3G/4G/5G)

## Diagnostico completo

Apos investigacao profunda, identifiquei **4 causas reais** da tela branca em redes moveis:

### Causa 1: Google Fonts bloqueia a renderizacao
O `<link rel="stylesheet">` do Google Fonts no `<head>` do `index.html` e **render-blocking**. O navegador NAO renderiza NADA ate baixar esse CSS externo. Em 3G, isso pode levar 5-10 segundos de tela branca pura.

### Causa 2: Nenhum conteudo visual antes do JavaScript
O `<body>` e o `#root` nao tem estilo inline. O fundo e branco ate o CSS do Tailwind carregar. Se o JS falhar ou demorar, o usuario ve tela branca indefinidamente.

### Causa 3: AuthProvider faz chamada de rede em TODAS as rotas
O `AuthProvider` executa `supabase.auth.getSession()` em TODAS as rotas, incluindo `/login/motorista` onde NAO e necessario (motoristas usam JWT customizado). Essa chamada de rede extra em 3G adiciona 2-5 segundos ao carregamento.

### Causa 4: Index.tsx no bundle principal carrega codigo desnecessario
O `Index.tsx` e importado diretamente (sem lazy) e puxa `useEventosPublicos` (queries ao Supabase), `EventosGrid`, `EventoCard` etc. Para um motorista acessando `/login/motorista`, esse codigo nunca e usado mas esta no bundle principal, aumentando o tamanho.

## Mudancas propostas

### 1. index.html - Fonte nao-bloqueante + fundo escuro inline

Substituir o carregamento da fonte para nao bloquear a renderizacao. Adicionar CSS inline minimo para fundo escuro imediato:

- `<link rel="stylesheet">` vira `<link rel="preload" as="style" onload="...">`
- Adicionar `<noscript>` fallback
- Adicionar `<style>` inline: `body,#root{margin:0;min-height:100vh;background:#0a0e1a}`

Resultado: o fundo escuro aparece em **menos de 100ms** mesmo em 3G, antes de qualquer JS carregar.

### 2. src/App.tsx - Tornar Index.tsx lazy novamente

O `Index.tsx` NAO e porta de entrada dos motoristas. Deve voltar a ser lazy-loaded para reduzir o bundle principal. Apenas `LoginMotorista`, `Auth`, `LoginEquipe` e `NotFound` devem ser imports diretos.

### 3. src/App.tsx - Separar AuthProvider das rotas de motorista

Criar um wrapper `LazyAuthProvider` que so carrega o `AuthProvider` completo (com `supabase.auth.getSession()`) quando a rota precisa. Para `/login/motorista` e `/app/:eventoId/motorista`, o AuthProvider nao e necessario.

Alternativa mais simples: mover as rotas de motorista para FORA do `AuthProvider`, ja que elas usam `DriverAuthContext` (localStorage, sem rede).

### 4. src/main.tsx - Handler global de erros

Adicionar listener para `unhandledrejection` e `error` no `window` para capturar erros nao tratados que podem causar tela branca silenciosa.

### 5. src/index.css - Fallback de fonte do sistema

Adicionar fontes do sistema como fallback para que o texto apareca imediatamente:
`font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

## Detalhes tecnicos

### Reorganizacao de rotas no App.tsx

A estrutura atual:

```text
QueryClientProvider
  AuthProvider          <-- chama supabase.auth.getSession() SEMPRE
    DriverAuthProvider  <-- apenas localStorage (rapido)
      StaffAuthProvider <-- apenas localStorage (rapido)
        NotificationsProvider (condicional)
          BrowserRouter
            Routes
              /login/motorista  <-- NAO precisa de AuthProvider
              /app/:id/motorista <-- NAO precisa de AuthProvider
              /auth             <-- precisa de AuthProvider
              /eventos          <-- precisa de AuthProvider
```

Nova estrutura proposta:

```text
QueryClientProvider
  DriverAuthProvider
    StaffAuthProvider
      BrowserRouter
        Routes
          /login/motorista     <-- SEM AuthProvider (rapido)
          /app/:id/motorista   <-- SEM AuthProvider (rapido)
          
          /* Rotas que precisam de auth admin */
          /auth, /eventos, etc <-- COM AuthProvider (wrapper por rota)
```

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `index.html` | Fonte async + CSS inline fundo escuro |
| `src/App.tsx` | Index lazy + AuthProvider so nas rotas admin + error handler |
| `src/index.css` | Font fallback do sistema |
| `src/main.tsx` | Global error/rejection handler |

### Impacto esperado

| Metrica | Antes | Depois |
|---|---|---|
| Primeiro pixel visivel (3G) | 5-10s (tela branca) | menos de 500ms (fundo escuro) |
| Chamadas de rede no /login/motorista | 1 (getSession desnecessario) | 0 |
| Bundle principal | Inclui Index + EventosGrid + queries | Sem Index (lazy) |
| Erros silenciosos | Tela branca sem feedback | Toast de erro + log |

