

# Corrigir fluxos de viagem: Supervisor, Motorista e botoes

## Problemas identificados

### 1. Todas as acoes de viagem do Supervisor estao quebradas (critico)

O componente `SupervisorViagensTab` renderiza `ViagemCardOperador` **sem passar a prop `operacoes`**. Isso faz com que o card use o hook padrao `useViagemOperacao()`, que depende de `useAuth()` (Supabase Auth). Supervisores usam **Staff JWT** (StaffAuthContext), entao `user` retorna `null` e **todas as acoes falham silenciosamente** (iniciar, chegada, encerrar, retorno).

**Correcao:** Instanciar `useViagemOperacaoStaff()` dentro de `SupervisorViagensTab` e passa-lo como prop `operacoes` para cada `ViagemCardOperador`.

### 2. Finalizacao de missao pelo motorista usa filtro errado (critico)

Em `AppMotorista.tsx` (linha 391), ao finalizar uma missao, a verificacao de "outras viagens ativas" usa `.eq('encerrado', false)` em vez de filtrar por `status`. Isso pode retornar viagens que ja foram encerradas mas com o booleano inconsistente, impedindo que o motorista volte ao status `disponivel`.

**Correcao:** Trocar `.eq('encerrado', false)` por `.in('status', ['agendado', 'em_andamento', 'aguardando_retorno'])`.

### 3. Botoes trocados no card de viagem (UX)

No `ViagemCardOperador`, quando um shuttle esta em `aguardando_retorno`:
- Atualmente: botao principal (grande) = "Iniciar Retorno", botao secundario (pequeno) = "Encerrar"
- Esperado pelo usuario: botao principal = "Concluir/Encerrar", botao secundario = "Retorno"

Tambem no swipe:
- Atualmente: swipe esquerdo = "Encerrar", swipe direito = "Retorno"
- Esperado: inverter posicoes

## Alteracoes por arquivo

### `src/components/app/SupervisorViagensTab.tsx`
- Importar `useViagemOperacaoStaff`
- Instanciar o hook no componente
- Passar `operacoes={staffOps}` para cada `ViagemCardOperador`

### `src/pages/app/AppMotorista.tsx`
- Linha 391: trocar `.eq('encerrado', false)` por `.in('status', ['agendado', 'em_andamento', 'aguardando_retorno'])`

### `src/components/app/ViagemCardOperador.tsx`
- Swipe (linhas 195-211): trocar posicoes - "Concluir" vai para direita (acao principal), "Retorno" vai para esquerda
- Botoes (linhas 391-415): "Concluir" vira o botao grande (flex-1), "Retorno" vira o botao secundario (outline)

