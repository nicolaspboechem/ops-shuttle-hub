
# Correcao: Missoes sem data_programada nao aparecem na listagem

## Problema

Quando uma missao e criada pelo botao "Chamar Base" (ou qualquer missao instantanea sem `data_programada`), o filtro de data no `MissoesPanel` usa `created_at.slice(0, 10)` como fallback. Isso pega a data em UTC, que pode diferir do dia operacional (fuso horario de Brasilia com virada as 04:00).

Exemplo: missao criada as 22:44 BRT (01:44 UTC do dia seguinte) tem `created_at` com data UTC = "2026-02-15", mas o dia operacional e "2026-02-14". O filtro nao encontra a missao.

## Solucao

Duas correcoes complementares:

### 1. Preencher `data_programada` ao criar missoes instantaneas

No `handleChamarBase` de `MapaServico.tsx` e em qualquer outro lugar que crie missoes sem `data_programada`, preencher automaticamente com o dia operacional atual. Isso resolve o problema na origem.

**Arquivo: `src/pages/MapaServico.tsx`**

Na funcao `handleChamarBase` (linha 360), adicionar `data_programada` ao payload do `createMissao`:

```text
const missao = await createMissao({
  ...
  data_programada: getDataOperacional(getAgoraSync(), horarioVirada),
});
```

Isso requer importar `getDataOperacional` e obter `horarioVirada` do evento (ja disponivel no componente ou buscavel como nos outros hooks).

### 2. Corrigir o fallback no filtro do MissoesPanel

Para missoes antigas que ja existem sem `data_programada`, corrigir o fallback no `MissoesPanel` para calcular a data operacional a partir do `created_at` em vez de simplesmente fatiar a string UTC.

**Arquivo: `src/components/motoristas/MissoesPanel.tsx`**

Na linha 71-73, substituir o fallback:

```text
// ANTES (bugado - usa data UTC):
if (!m.data_programada) {
  const createdDate = m.created_at ? m.created_at.slice(0, 10) : '';
  return createdDate === missaoDataFilter;
}

// DEPOIS (correto - calcula dia operacional):
if (!m.data_programada) {
  if (!m.created_at) return false;
  const createdOpDate = getDataOperacional(new Date(m.created_at), horarioVirada);
  return createdOpDate === missaoDataFilter;
}
```

O `horarioVirada` precisa ser obtido do evento. O `MissoesPanel` recebe `eventoId` como prop, entao podemos buscar o `horario_virada_dia` (ou recebe-lo como prop do componente pai).

### 3. Garantir que o PainelLocalizador tambem preencha data_programada

O Painel Localizador (`PainelLocalizador.tsx`) tambem tem acoes de "Chamar Base" similares. Verificar se tambem precisam dessa correcao.

## Resumo das alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MapaServico.tsx` | Adicionar `data_programada` com dia operacional atual ao `handleChamarBase` |
| `src/components/motoristas/MissoesPanel.tsx` | Corrigir fallback do filtro de data para usar `getDataOperacional` em vez de `slice(0,10)` UTC |

## Resultado

- Missoes criadas pelo "Chamar Base" terao `data_programada` preenchida corretamente
- Missoes sem `data_programada` (legadas) serao filtradas pelo dia operacional correto baseado no `created_at`
- A missao do Carlos Henrique passara a aparecer na listagem do dia 14/fev
