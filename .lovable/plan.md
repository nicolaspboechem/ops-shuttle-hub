

# Reaplicar otimizacoes de carregamento 4G (v1.8.0)

As correcoes documentadas no relatorio (commits `4630037` e `d8fd08a`) foram revertidas. O codigo atual ainda tem os 3 problemas originais que causam tela branca no 3G/4G/5G.

## Problema atual no codigo

1. `vite.config.ts` nao tem `modulePreload: false` - o Vite precarrega todos os 166 chunks no carregamento inicial
2. `App.tsx` tem TODAS as paginas como lazy-loaded, incluindo `LoginMotorista`, `Auth`, `Index`
3. `lazyRetry` ainda faz `window.location.reload()` criando loop infinito em redes lentas

## Mudancas

### 1. vite.config.ts - Desabilitar modulePreload

Adicionar `modulePreload: false` na configuracao de build para impedir o prefetch de todos os chunks.

### 2. App.tsx - Importar paginas criticas diretamente

Converter 5 paginas de lazy-load para import direto:
- `LoginMotorista` - porta de entrada dos motoristas
- `Auth` - porta de entrada dos admins
- `Index` - pagina raiz
- `LoginEquipe` - login de staff
- `NotFound` - fallback

### 3. App.tsx - Reescrever lazyRetry sem reload

Substituir `window.location.reload()` por retry do `import()` com backoff progressivo (3 tentativas: 1.5s, 2.25s, 3.375s). Se falhar, exibir componente visual com botao "Tentar novamente" em vez de tela branca.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `vite.config.ts` | Adicionar `modulePreload: false` |
| `src/App.tsx` | Import direto das 5 paginas criticas + reescrever lazyRetry |

## Resultado esperado

- Carregamento inicial baixa ~200KB em vez de 1.3MB
- LoginMotorista renderiza instantaneamente sem depender de chunk extra
- Falha de chunk mostra botao manual em vez de loop infinito

