

# Corrigir Tela Branca no Vercel + Limpeza de Duplicatas

## Diagnostico

O Supabase client usa URLs **hardcoded** no codigo (nao depende de variaveis de ambiente). A tela branca apos login no Vercel e causada por falha no carregamento dos chunks JS lazy-loaded, nao por falta de conexao com o banco.

Tambem encontrei dois problemas de duplicacao introduzidos na ultima edicao:
- `src/main.tsx`: registro do Service Worker duplicado (2x o mesmo bloco)
- `index.html`: `<link rel="manifest">` duplicado (ja existia na linha 23)

## Alteracoes

### 1. Remover duplicatas

**`src/main.tsx`**: Remover o bloco duplicado de registro do Service Worker (manter apenas um).

**`index.html`**: Remover o `<link rel="manifest">` duplicado (manter apenas o original).

### 2. Adicionar Error Boundary global para chunks

Criar um componente `ErrorBoundary` que captura erros de renderizacao do React (incluindo falhas de chunks lazy) e exibe uma mensagem com botao de reload, em vez de tela branca.

**`src/components/ErrorBoundary.tsx`**: Class component React com `componentDidCatch` que mostra UI de erro amigavel.

Envolver as rotas principais no `App.tsx` com este `ErrorBoundary`.

### 3. Melhorar loading do AppMotorista

Adicionar um estado de loading mais visivel no `AppMotorista` enquanto os dados do motorista e presenca estao sendo buscados, para que o usuario veja feedback visual em vez de tela vazia.

## Secao tecnica

### Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error) {
    console.error('React Error Boundary:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Erro ao carregar. <button onClick={reload}>Recarregar</button></div>;
    }
    return this.props.children;
  }
}
```

### Duplicatas a remover

- `src/main.tsx` linhas 16-22 (segundo bloco de SW registration) -- manter apenas o primeiro
- `index.html` linha 23 duplicada -- manter apenas uma instancia

## Nota importante

Se a tela branca persistir no Vercel apos estas correcoes, o usuario deve abrir o **Console do navegador** (F12) na URL do Vercel para verificar qual erro exato aparece. Isso permitira um diagnostico preciso do problema no deploy.

