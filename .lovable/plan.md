

# Auto-Finalizar Eventos pela Data de Termino

## Problema

O evento Rio Open 2026 tem `data_fim = 2026-02-25` mas continua com status `ativo`. A edge function `close-open-trips` nao verifica a data de termino do evento, portanto nunca o encerra automaticamente. Isso deixa viagens abertas, veiculos vinculados e motoristas com presenca ativa apos o fim do evento.

## Solucao

Adicionar um **Bloco 0** (executado ANTES dos outros blocos) na edge function `close-open-trips` que:

1. Busca eventos ativos que possuem `data_fim` definida
2. Para cada evento onde `data_fim < data operacional atual` (ja passou):
   - Encerra TODAS as viagens abertas do evento
   - Desvincula TODOS os veiculos de motoristas (bidirecional)
   - Fecha TODAS as presencas ativas (checkout automatico)
   - Altera o status do evento para `finalizado`
   - Registra desvinculacoes no historico de vistoria

3. Eventos finalizados sao removidos do array de eventos ativos, evitando processamento duplicado nos blocos seguintes

## Logica de verificacao

A condicao para finalizar considera o horario de virada: o evento so e considerado encerrado apos a virada do dia seguinte ao `data_fim`. Exemplo: se `data_fim = 2026-02-25` e virada = `04:50`, o evento sera finalizado a partir de `2026-02-26 04:50`.

```text
data_fim = 2026-02-25
virada   = 04:50
agora    = 2026-02-26 10:00 (SP)
data_op  = 2026-02-26

2026-02-26 > 2026-02-25 --> FINALIZAR
```

## Arquivo modificado

`supabase/functions/close-open-trips/index.ts` - Adicionar Bloco 0 antes do Bloco 1, incluindo:
- Fetch de `data_fim` no select de eventos (ja busca `id, horario_virada_dia, nome_planilha`, adicionar `data_fim`)
- Loop que identifica eventos expirados
- Para cada evento expirado:
  - UPDATE viagens SET encerrado=true, status='encerrado' WHERE evento_id=X AND encerrado=false
  - SELECT motoristas com veiculo_id != null, e para cada um: limpar motorista.veiculo_id e veiculo.motorista_id + inserir historico
  - UPDATE motorista_presenca SET checkout_at=now WHERE evento_id=X AND checkout_at IS NULL
  - UPDATE motoristas SET status='indisponivel' WHERE evento_id=X
  - UPDATE eventos SET status='finalizado' WHERE id=X
- Filtrar esses eventos do array antes de passar para os blocos 1-4

## Efeito imediato

Ao chamar a function apos o deploy, o Rio Open 2026 sera automaticamente finalizado, todas as viagens encerradas, veiculos desvinculados e motoristas liberados.
