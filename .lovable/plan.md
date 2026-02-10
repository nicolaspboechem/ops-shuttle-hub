

# Adicionar campo de Data Programada nas Missoes

## Resumo

Adicionar um campo `data_programada` (tipo DATE) na tabela `missoes` para permitir agendar missoes para dias futuros. O CCO podera filtrar missoes por data, e os motoristas so verao missoes programadas para o dia atual (ou sem data definida = imediatas).

## Alteracoes

### 1. Migration: adicionar coluna `data_programada`

Criar migration SQL adicionando a coluna `data_programada` (tipo DATE, nullable) na tabela `missoes`. Valor NULL significa missao imediata (comportamento atual preservado).

### 2. Atualizar types do Supabase

Adicionar `data_programada: string | null` nos tipos Row, Insert e Update da tabela `missoes` em `src/integrations/supabase/types.ts`.

### 3. Atualizar interface Missao e MissaoInput

**Arquivo**: `src/hooks/useMissoes.ts`

- Adicionar `data_programada: string | null` na interface `Missao`
- Adicionar `data_programada?: string | null` na interface `MissaoInput`
- No `createMissao`, passar `data_programada` no INSERT

### 4. Adicionar campo de data no MissaoModal (wizard do CCO)

**Arquivo**: `src/components/motoristas/MissaoModal.tsx`

- Adicionar estado `dataProgramada` (string, default = data de hoje no formato YYYY-MM-DD)
- Adicionar input `type="date"` na linha do Horario/PAX/Prioridade (reorganizar grid de 3 para 2 linhas)
- Layout: primeira linha com Data e Horario (grid-cols-2), segunda linha com PAX e Prioridade (grid-cols-2)
- Passar `data_programada` no onSave
- Ao editar missao existente, preencher com o valor salvo

### 5. Filtrar missoes por data no CCO (Motoristas.tsx)

**Arquivo**: `src/pages/Motoristas.tsx`

- Adicionar filtro de data (input date ou DiaSeletor) na barra de filtros das missoes
- Estado `missaoDataFilter` (string | null, default = data de hoje)
- No `filteredMissoes`, adicionar filtro: se `missaoDataFilter` definido, mostrar apenas missoes cuja `data_programada` seja igual a essa data OU missoes sem data (imediatas do dia de criacao)
- Adicionar coluna "Data" na tabela de lista

### 6. Filtrar missoes por data no App do Motorista

**Arquivo**: `src/pages/app/AppMotorista.tsx`

- No `minhasMissoes` (useMemo), adicionar filtro: mostrar apenas missoes onde `data_programada` e NULL (imediata) ou igual a data operacional de hoje (usando `getDataOperacional` do utilitario existente)
- Isso garante que missoes agendadas para o futuro nao aparecam para o motorista ate o dia certo

### 7. Exibir data nos cards de missao

**Arquivo**: `src/components/motoristas/MissaoCard.tsx` (CCO)

- Exibir a data programada no card (ex: "10/02" ou "Hoje" se for hoje)

**Arquivo**: `src/components/app/MissaoCardMobile.tsx` (Motorista)

- Exibir a data no card mobile (sutil, ja que o motorista so ve missoes do dia)

## Secao tecnica

```text
-- Migration
ALTER TABLE missoes ADD COLUMN data_programada DATE;

-- Missoes sem data = imediatas (retrocompatibilidade)
-- Missoes com data = programadas para aquele dia
```

Fluxo de filtragem no motorista:
```text
const hoje = getDataOperacional(getAgoraSync(), evento?.horario_virada_dia);
const minhasMissoes = missoes.filter(m =>
  m.motorista_id === motoristaData.id &&
  ['pendente', 'aceita', 'em_andamento'].includes(m.status) &&
  (!m.data_programada || m.data_programada === hoje)
);
```

Resultado: o CCO pode criar missoes para qualquer dia, filtrar por data, e os motoristas so veem no dia certo.
