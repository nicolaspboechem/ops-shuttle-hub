

# Corrigir auditoria: registros anteriores ao dia 15/02 nao aparecem

## Problema

O hook `useMotoristaPresencaHistorico` usa `diasHistorico = 7` por padrao (linha 41). Hoje e 22/02, entao o filtro `.gte('data', dataInicio)` corta tudo antes de 15/02. O evento comecou em 10/02, e ha 121 registros de presenca entre 10/02 e 14/02 que ficam invisíveis.

O seletor permite no maximo 30 dias, mas o correto e permitir ver desde o inicio do evento.

## Dados confirmados no banco

| Data | Registros |
|---|---|
| 10/02 | 1 |
| 11/02 | 19 |
| 12/02 | 28 |
| 13/02 | 35 |
| 14/02 | 38 |
| 15/02 - 22/02 | 286 |
| **Total** | **417** |

## Alteracoes

### `src/hooks/useMotoristaPresencaHistorico.ts`

- Adicionar parametro opcional `dataInicioEvento?: string` (formato 'yyyy-MM-dd')
- Quando `dataInicioEvento` for fornecido, usar como filtro em vez de `subDays(new Date(), diasHistorico)`
- Quando `diasHistorico` for `0` (ou um valor sentinela como `999`), nao aplicar filtro de data (buscar tudo do evento)

### `src/components/motoristas/MotoristasAuditoria.tsx`

- Buscar o `data_inicio` do evento via `useEventos` (ja disponivel no sistema)
- Passar para o hook como `dataInicioEvento`
- Alterar o seletor "Historico" para incluir opcao "Desde o inicio" que envia `diasHistorico = 0` e usa `data_inicio` do evento
- Manter opcoes de 7, 15, 30 dias como atalhos

### Logica de decisao do filtro

```text
Se diasHistorico = 0 (Desde o inicio):
  dataInicio = evento.data_inicio (ex: '2026-02-10')
Senao:
  dataInicio = subDays(now, diasHistorico)
```

## Resultado esperado

- Ao abrir a auditoria, o padrao continua sendo 7 dias (performance)
- O usuario pode selecionar "Desde o inicio" para ver todos os 417 registros
- Motoristas com presenca apenas nos dias 10-14/02 passam a aparecer quando o periodo correto e selecionado

