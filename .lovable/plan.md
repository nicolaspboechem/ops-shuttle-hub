

# 3 Melhorias: Auto-Checkout na Virada, Liberar Check-in Duplo, e Veiculo no Mapa de Servico

## 1. Auto-Checkout na Virada do Dia Operacional

### Problema
Motoristas esquecem de fazer checkout, deixando registros de presenca abertos indefinidamente. Isso impede que o dia anterior seja consolidado corretamente.

### Solucao
Criar uma Edge Function `auto-checkout` que sera executada por cron job no horario de virada de cada evento. A funcao:

1. Busca todos os eventos ativos com `habilitar_missoes = true`
2. Para cada evento, calcula a data operacional do dia ANTERIOR baseada no `horario_virada_dia`
3. Encontra registros de `motorista_presenca` com `checkin_at` preenchido mas `checkout_at` nulo para essa data
4. Faz checkout automatico de todos esses motoristas (preenche `checkout_at` e muda status para `indisponivel`)
5. Opcionalmente desvincula o veiculo (`veiculo_id = null` na tabela motoristas)

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/auto-checkout/index.ts` | Nova Edge Function que faz checkout em massa de motoristas pendentes |
| Cron job (SQL insert) | Agendar execucao a cada 15 minutos para cobrir horarios de virada variados |

A funcao verifica o `horario_virada_dia` de cada evento e so age quando o horario atual estiver dentro de uma janela (ex: nos 15 minutos apos a virada). Observacao no checkout automatico: "Checkout automatico - virada do dia operacional".

### Logica simplificada
```
Para cada evento ativo com missoes:
  virada = evento.horario_virada_dia (ex: 02:30)
  Se agora esta entre virada e virada+15min:
    data_ontem = data operacional anterior
    Buscar presencas com checkin_at != null AND checkout_at = null AND data = data_ontem
    Para cada presenca:
      UPDATE checkout_at = now(), observacao_checkout = 'Auto-checkout'
      UPDATE motoristas SET status = 'indisponivel'
```

---

## 2. Liberar Check-in (permitir re-check-in no mesmo dia)

### Problema
Quando um motorista tem checkout realizado (manual ou automatico), ele nao consegue fazer check-in novamente no mesmo dia porque ja existe um registro de presenca com checkout. O admin precisa de uma opcao manual para "liberar" o check-in.

### Solucao
A tabela `motorista_presenca` tem constraint UNIQUE em `(motorista_id, evento_id, data)`. O handleCheckin em `useEquipe.ts` ja faz upsert (se existe, atualiza; se nao, insere). O problema e que quando ja existe um registro com checkout, o check-in deveria poder limpar o checkout e reabrir.

Na verdade, olhando o codigo do `handleCheckin`, ele ja faz `update({ checkin_at: now, checkout_at: null })` se existir registro. Entao o check-in "re-abre" automaticamente. Porem, a interface pode estar escondendo o botao de check-in quando ja existe checkout.

A solucao e adicionar um botao "Liberar Check-in" no dropdown do card/kanban do motorista que:
1. Limpa o `checkout_at` do registro de presenca do dia
2. Atualiza o status do motorista para `disponivel`
3. Forca refetch para atualizar a UI

| Arquivo | Mudanca |
|---|---|
| `src/pages/Motoristas.tsx` | Adicionar handler `handleLiberarCheckin` e passa-lo aos cards/kanban |
| `src/components/motoristas/MotoristaKanbanCard.tsx` | Adicionar item "Liberar Check-in" no dropdown (visivel apenas quando presenca tem checkout) |

O botao so aparece quando:
- O motorista tem presenca do dia (`checkin_at` preenchido)
- E o `checkout_at` tambem esta preenchido (jornada encerrada)

Ao clicar, o admin limpa o checkout e o motorista pode fazer check-in novamente pelo app.

---

## 3. Exibir Veiculo no Card do Mapa de Servico

### Problema
O CCO precisa saber qual veiculo esta com cada motorista no Mapa de Servico, mas essa informacao nao esta visivel quando o motorista esta em missao.

### Situacao atual
O `MapaServicoCard` ja exibe o veiculo na Row 3 (nome + placa). Porem, a informacao pode nao estar aparecendo corretamente quando o motorista esta em missao (Row 4/5 podem estar ocupando o espaco visual).

### Solucao
Garantir que a Row 3 (veiculo) esteja SEMPRE visivel, independente do status de missao. Ajustar o layout para que o veiculo apareca logo abaixo do nome do motorista com destaque visual.

| Arquivo | Mudanca |
|---|---|
| `src/components/mapa-servico/MapaServicoCard.tsx` | Reorganizar para garantir que veiculo + placa fique sempre visivel abaixo do nome, com estilo mais destacado |

Na pratica, o card ja mostra o veiculo. A mudanca e cosmetic: tornar mais visivel com fonte um pouco maior e cor mais destacada para nome do veiculo.

---

## Resumo de Arquivos

| # | Arquivo | Tipo |
|---|---|---|
| 1 | `supabase/functions/auto-checkout/index.ts` | Novo - Edge Function para checkout automatico |
| 2 | SQL (cron job via insert) | Agendar execucao periodica |
| 3 | `src/pages/Motoristas.tsx` | Adicionar handler `handleLiberarCheckin` |
| 4 | `src/components/motoristas/MotoristaKanbanCard.tsx` | Adicionar botao "Liberar Check-in" no dropdown |
| 5 | `src/components/mapa-servico/MapaServicoCard.tsx` | Destacar info do veiculo no card |

