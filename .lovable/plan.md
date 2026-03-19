

## Correção: Operadores veem todas as viagens por padrão

### Problema
No `AppOperador.tsx`, linha 164, o estado `apenasMinhas` inicia como `true`, fazendo com que operadores vejam apenas as viagens que eles criaram/iniciaram. O correto é mostrar **todas as viagens** por padrão.

### Mudança

**Arquivo: `src/pages/app/AppOperador.tsx`**

1. Linha 164: Alterar `useState(true)` para `useState(false)` — operadores agora veem todas as viagens ao abrir o app
2. O toggle "Ver apenas minhas" já existe no menu dropdown (linha 589-592) e permanece como opção oculta no menu ⋮

Apenas 1 caractere muda: `true` → `false`.

