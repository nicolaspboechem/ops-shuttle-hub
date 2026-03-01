
# Corrigir Dashboard geral, adicionar tipo e identificacao de supervisor nas viagens

## Problema 1: Dashboard nao consolida dados quando "Geral" (todos)

No `Dashboard.tsx` (linha 104-108), o filtro `viagensFiltradas` nao trata `tipoOperacao === 'todos'`. Quando o usuario seleciona "Geral", nenhuma viagem passa no filtro porque nenhuma tem `tipo_operacao === 'todos'`.

## Problema 2: Sem identificacao visual de tipo na tabela

A `ViagensTable` nao distingue visualmente shuttle/transfer/missao.

## Problema 3: Sem nome do supervisor que iniciou a viagem

O campo `iniciado_por` (UUID) existe na tabela `viagens` mas nao e exibido na ViagensTable. Precisamos resolver o UUID para nome usando o hook `useUserNames`.

## Solucao

### 1. Corrigir filtro no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx`

Alterar `viagensFiltradas` para passar todas as viagens quando `tipoOperacao === 'todos'`:

```typescript
const viagensFiltradas = useMemo(() => {
  let filtered = viagens;
  if (tipoOperacao !== 'todos') {
    filtered = viagens.filter(v => {
      if (tipoOperacao === 'missao') return !!v.origem_missao_id;
      return v.tipo_operacao === tipoOperacao && !v.origem_missao_id;
    });
  }
  if (rotaFiltro !== 'todas') {
    filtered = filtered.filter(v => v.ponto_embarque === rotaFiltro);
  }
  return filtered;
}, [viagens, tipoOperacao, rotaFiltro]);
```

Alterar estado inicial de `tipoOperacao` para `'todos'` (o Dashboard e o painel geral).

### 2. Adicionar coluna "Tipo" na ViagensTable

**Arquivo:** `src/components/viagens/ViagensTable.tsx`

Adicionar coluna com badge colorido:
- **Missao** (roxo) - quando `origem_missao_id` existe
- **Transfer** (ambar) - quando `tipo_operacao === 'transfer'`
- **Shuttle** (verde) - quando `tipo_operacao === 'shuttle'`

### 3. Adicionar coluna "Iniciado por" na ViagensTable

**Arquivo:** `src/components/viagens/ViagensTable.tsx`

- Coletar todos os `iniciado_por` das viagens visiveis
- Usar o hook `useUserNames` (ja existe em `src/hooks/useUserNames.ts`) para resolver UUIDs para nomes
- Exibir o nome na nova coluna "Iniciado por"
- Quando `iniciado_por` for null, exibir "-"

### 4. Exibir rota resumida na coluna Motorista

Na coluna "Motorista", adicionar uma linha secundaria com a rota (`Embarque > Desembarque`) em texto menor e cor atenuada, para identificar rapidamente a viagem.

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard.tsx` | Corrigir filtro para 'todos', estado inicial 'todos' |
| `src/components/viagens/ViagensTable.tsx` | Adicionar colunas "Tipo" e "Iniciado por", exibir rota resumida |
