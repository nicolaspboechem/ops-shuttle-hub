

# Corrigir presenças sem checkout + Prevenir duplicatas de check-in

## Situacao atual

### Dados a corrigir

**Duplicatas por race condition (mesmo dia, mesma hora):**
- Fabricio Fernandes: 3 registros identicos em 21/02 (16:53:29) - manter 1, deletar 2
- Alexandre Lima: 2 registros identicos em 21/02 (19:39:06) - manter 1, deletar 1

**Presenças de dias anteriores sem checkout:**
- Rafael Santos: 2 registros abertos (dias 19 e 20)
- Fabricio Fernandes: 1 registro aberto (dia 20)
- Felipe Quirino: 1 registro aberto (dia 19)
- Cassio dos Santos Motta: 1 registro aberto (dia 19)

Esses registros de dias anteriores devem receber checkout no horario de virada (04:50) do respectivo dia operacional, pois o motorista claramente encerrou o expediente sem fazer checkout.

### Problema de fluxo

Quando o CCO clica "Liberar Check-in", apenas altera `motoristas.status = 'disponivel'`. O app do motorista detecta isso via Realtime e pode disparar multiplas chamadas `realizarCheckin()` antes que a primeira termine, criando duplicatas. O guard atual (`existingActive` query) nao e atomico.

## Correcoes

### 1. Migration SQL - Limpar dados

```text
-- Deletar duplicatas do Fabricio (manter 5a2028c5, deletar os outros 2)
DELETE FROM motorista_presenca 
WHERE id IN ('ee7aba65-32c7-47f9-879a-229d23f8e89b', '0324bcec-66d8-4c83-8f1c-e0b8d3acc846');

-- Deletar duplicata do Alexandre Lima (manter 9e2e9621, deletar o outro)
DELETE FROM motorista_presenca 
WHERE id = '254f7c18-2d0b-4cfd-a4b9-1f5262b69313';

-- Fechar presenças orfas de dias anteriores com checkout no horario de virada
-- Dia 19 -> virada = 2026-02-20 04:50:00 BRT = 2026-02-20 07:50:00 UTC
UPDATE motorista_presenca SET checkout_at = '2026-02-20 07:50:00+00', 
  observacao_checkout = 'Checkout automático (virada operacional)'
WHERE id IN ('465e442f-fa21-4615-8ad3-8ac2abe50906', '627c532f-5c35-4c64-9ef5-bb74bb715e8e', 'ae652437-4dab-474e-afec-a82fff425e8f');

-- Dia 20 -> virada = 2026-02-21 04:50:00 BRT = 2026-02-21 07:50:00 UTC
UPDATE motorista_presenca SET checkout_at = '2026-02-21 07:50:00+00',
  observacao_checkout = 'Checkout automático (virada operacional)'
WHERE id IN ('050e4f09-970e-42eb-b8be-99fcae400a5e', 'bca839ef-0876-4e90-98c4-6bfa35d6cf98');
```

### 2. Prevenir race condition no check-in

**Arquivo:** `src/hooks/useMotoristaPresenca.ts`

Adicionar `useRef(false)` como guard de concorrencia no `realizarCheckin`:

```text
const checkinInProgress = useRef(false);

const realizarCheckin = async () => {
  if (checkinInProgress.current) return false;
  checkinInProgress.current = true;
  try {
    // ... logica existente ...
  } finally {
    checkinInProgress.current = false;
  }
};
```

Isso garante que mesmo com multiplos triggers Realtime, apenas uma chamada passa.

### 3. Exibir turnos no historico de auditoria

**Arquivo:** `src/components/motoristas/MotoristaAuditoriaCard.tsx`

Agrupar presencas por `data`. Quando ha mais de 1 registro no mesmo dia, exibir badge "1o Turno", "2o Turno" etc. Ordenar por `checkin_at` dentro do dia.

Exemplo visual:
```text
sabado, 21/02 - 1o Turno
  In: 08:16  Out: 09:05  TKB0J35  0h 48min

sabado, 21/02 - 2o Turno
  In: 16:53  Out: --:--
```

### 4. Corrigir contagem totalDias

**Arquivo:** `src/hooks/useMotoristaPresencaHistorico.ts`

Alterar `totalDias` para contar dias unicos em vez de numero de registros:

```text
totalDias: new Set(presencasMotorista.map(p => p.data)).size
```

### 5. Associar viagens ao turno correto

**Arquivo:** `src/components/motoristas/MotoristaAuditoriaCard.tsx`

Em vez de filtrar viagens por `data_criacao.startsWith(data)` (que mostra todas as viagens do dia em todos os turnos), filtrar pelo intervalo `checkin_at` a `checkout_at` de cada turno individual.

## Resumo de arquivos

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Deletar duplicatas + fechar presenças orfas com checkout na virada |
| `src/hooks/useMotoristaPresenca.ts` | Guard `useRef` contra race condition no check-in |
| `src/hooks/useMotoristaPresencaHistorico.ts` | `totalDias` conta dias unicos |
| `src/components/motoristas/MotoristaAuditoriaCard.tsx` | Exibir numero do turno + viagens por turno |

