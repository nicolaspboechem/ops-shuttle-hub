

# Adicionar "Liberar Check-in" nas views Card/Lista + Corrigir notificacao no App Motorista

## Problema 1: Opcao "Liberar Check-in" ausente nas views Card e Lista

A opcao "Liberar Check-in" existe apenas no Kanban (`MotoristaKanbanCard`). As views de Card e Lista usam o componente `MotoristaDropdownActions` (definido dentro de `Motoristas.tsx`), que nao possui esta opcao.

## Problema 2: Motorista nao ve que pode fazer check-in novamente

Quando o CCO "libera check-in", o sistema atualiza `motoristas.status = 'disponivel'`. O hook `useMotoristaPresenca` recebe a mudanca via Realtime. Porem, a funcao `fetchPresenca` (via RPC `get_motorista_presenca`) continua retornando o registro antigo com `checkout_at` preenchido como `presenca_recente`. O `CheckinCheckoutCard` ve `hasCheckin = true` e `hasCheckout = true` e mostra "Expediente encerrado" em vez de permitir novo check-in.

A correcao: quando o motorista tem `status = 'disponivel'` mas o ultimo registro de presenca ja tem checkout, o card deve mostrar o estado de "Iniciar Expediente" (permitir novo check-in), nao "Expediente encerrado".

## Alteracoes

### 1. `src/pages/Motoristas.tsx` - Adicionar "Liberar Check-in" ao `MotoristaDropdownActions`

No componente `MotoristaDropdownActions` (linha ~443), adicionar:
- Receber `presenca` e `onLiberarCheckin` como props
- Adicionar item de menu "Liberar Check-in" condicional: so aparece quando `presenca?.checkin_at` e `presenca?.checkout_at` existem (jornada encerrada)
- Importar icone `RotateCcw` de lucide-react

Nas chamadas ao `MotoristaDropdownActions` (card view na linha ~756 e list view na linha ~1023), passar as novas props:
- `presenca={getPresenca(motorista.id)}`
- `onLiberarCheckin={() => handleLiberarCheckin(motorista.id)}`

### 2. `src/hooks/useMotoristaPresenca.ts` - Corrigir logica de presenca apos "liberar check-in"

No `processRpcResult`, adicionar logica: se o motorista tem `status = 'disponivel'` (vindo do resultado RPC ou consultado separadamente) e o ultimo registro de presenca tem checkout preenchido, tratar como se nao houvesse presenca ativa (setPresenca(null)). Isso faz o `CheckinCheckoutCard` renderizar o estado "Iniciar Expediente".

Alternativamente, buscar o status do motorista no RPC result e, quando status for 'disponivel' e a presenca mais recente tiver checkout, definir `presenca` como `null` para que o motorista veja o botao de check-in.

### 3. `src/hooks/useMotoristaPresenca.ts` - Buscar status do motorista

O RPC `get_motorista_presenca` pode ja retornar o status do motorista. Caso contrario, adicionar uma query ao campo `status` da tabela `motoristas` dentro do `fetchPresenca`. Usar esse status para decidir:
- Se `status === 'disponivel'` e nao ha presenca ativa (so presenca com checkout) --> `setPresenca(null)` para mostrar tela de check-in
- Se `status === 'indisponivel'` ou `expediente_encerrado` e ha presenca com checkout --> manter presenca com checkout (tela "encerrado")

Isso garante que quando o CCO libera o check-in (muda status para 'disponivel'), o app do motorista automaticamente mostra o botao de check-in via Realtime.

