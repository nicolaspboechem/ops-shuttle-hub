

# Corrigir Localizador: Filtrar por Data Operacional + Coluna de Missoes Pendentes

## Problema

1. O Painel Localizador busca missoes ativas **sem filtrar por data operacional**, causando missoes antigas (de dias anteriores) aparecendo no painel e gerando inconsistencias de rota.
2. Missoes pendentes nao tem visibilidade propria - ficam misturadas nos cards dos motoristas, dificultando a operacao.

## Solucao

### 1. Filtrar missoes por data operacional (`PainelLocalizador.tsx`)

- Buscar `horario_virada_dia` do evento (junto com `nome_planilha` no useEffect existente)
- Usar `getDataOperacional()` para calcular o dia operacional atual
- Na query `fetchMissoes`, adicionar filtro: `.or('data_programada.eq.${dataOp},data_programada.is.null')`
- Incluir `created_at` no SELECT para desempate
- No `missoesPorMotorista` (useMemo), priorizar: `em_andamento` > `aceita` > `pendente`, desempatando por `created_at` mais recente

### 2. Nova coluna "Missoes Pendentes" (fixa, ao lado de "Retornando")

- Criar um `useMemo` que extrai missoes pendentes **nao atribuidas a motoristas com missao ativa** (ou seja, missoes pendentes cujo motorista NAO tem outra missao `aceita`/`em_andamento`)
- Essas missoes pendentes serao exibidas como cards simples numa coluna fixa nova, usando um componente dedicado
- A coluna mostra: nome do motorista, rota (origem -> destino), e status "Pendente"
- Usa o tipo `pendente` no `LocalizadorColumn` com estilo amarelo/amber

### 3. Novo tipo de coluna no `LocalizadorColumn`

- Adicionar tipo `pendente` ao `columnConfig` com cor amber (similar a retornando_base mas amarelo)

### Alteracoes tecnicas

**`src/pages/PainelLocalizador.tsx`**:
- Import `getDataOperacional` de `@/lib/utils/diaOperacional`
- Novo state `horarioVirada` (string, default '04:00')
- Na query do evento, buscar tambem `horario_virada_dia`
- `fetchMissoes`: adicionar `created_at` ao select + filtro `.or()` por data operacional
- Novo `useMemo` para `missoesPendentes`: lista de missoes pendentes com nome do motorista (cruzando com os motoristas ja carregados)
- Renderizar nova coluna fixa "Missoes Pendentes" nas colunas fixas (ao lado de Retornando e Outros)
- Atualizar stat do header para incluir contagem de pendentes

**`src/components/localizador/LocalizadorColumn.tsx`**:
- Adicionar `pendente` ao tipo e ao `columnConfig` (icone Clock, cor amber)

**`src/components/localizador/LocalizadorCard.tsx`** (sem alteracao - cards de motoristas com missao pendente ja exibem "Missao Pendente" corretamente)

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/PainelLocalizador.tsx` | Filtro por data operacional + coluna de pendentes |
| `src/components/localizador/LocalizadorColumn.tsx` | Novo tipo `pendente` no columnConfig |

