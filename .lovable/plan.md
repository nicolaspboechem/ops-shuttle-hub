

# Corrigir Bug de Timezone nas Datas do EditEventoModal

## Problema

O banco de dados armazena as datas corretas (ex: `data_inicio = "2026-02-10"`, `data_fim = "2026-02-15"`), mas o modal de edicao exibe um dia a menos (09/02 e 14/02).

**Causa raiz**: `new Date("2026-02-10")` e interpretado pelo JavaScript como meia-noite UTC. No fuso de Brasilia (UTC-3), isso vira 21:00 do dia **9 de fevereiro**. Quando `format()` formata usando horario local, mostra o dia anterior.

Se o usuario salvar sem alterar, o sistema grava a data errada (um dia antes), corrompendo os dados progressivamente.

## Solucao

Alterar o parse das datas para criar objetos Date no horario local, evitando a conversao UTC.

**De:**
```
setDataInicio(new Date(evento.data_inicio));
setDataFim(new Date(evento.data_fim));
```

**Para:**
```
setDataInicio(new Date(evento.data_inicio + 'T12:00:00'));
setDataFim(new Date(evento.data_fim + 'T12:00:00'));
```

Adicionando `T12:00:00`, o JavaScript interpreta como horario local (meio-dia), eliminando qualquer risco de mudanca de dia por fuso horario.

## Arquivo alterado

| Arquivo | Acao |
|---------|------|
| `src/components/eventos/EditEventoModal.tsx` | Corrigir parse de `data_inicio` e `data_fim` (linhas 64 e 67) |

