

# Corrigir Priorizacao de Missoes e Ajustes no Localizador

## 1. Priorizacao por horario_previsto

**Problema atual:** O desempate entre missoes de mesmo status usa `created_at`, mas deveria usar `horario_previsto` (horario agendado). Somente missoes instantaneas (sem `horario_previsto`) devem usar `created_at` como fallback.

**Solucao:**

### `src/pages/PainelLocalizador.tsx`

**a) Adicionar `horario_previsto` na query** (linha 87):
```
.select('id, motorista_id, ponto_embarque, ponto_desembarque, status, created_at, horario_previsto')
```

**b) Alterar logica de desempate** (linha 156):
Quando duas missoes tem o mesmo status, priorizar por `horario_previsto` (mais cedo primeiro). Se uma tem `horario_previsto` e outra nao, a agendada tem prioridade. Somente quando ambas nao tem `horario_previsto`, usar `created_at`.

Nova logica de comparacao:
```typescript
// Desempate: horario_previsto (mais cedo ganha), fallback created_at
function compareMissoes(a, b) {
  if (a.horario_previsto && b.horario_previsto) {
    return a.horario_previsto < b.horario_previsto; // mais cedo ganha
  }
  if (a.horario_previsto && !b.horario_previsto) return true; // agendada ganha
  if (!a.horario_previsto && b.horario_previsto) return false;
  return a.created_at > b.created_at; // instantaneas: mais recente ganha
}
```

Aplicar essa logica em todos os 3 pontos de priorizacao:
- `missoesPorMotorista` (linha 146-162)
- `missoesPendentes > perDriver` (linha ~188)
- `missoesPendentesPorMotorista` (linha ~197)

## 2. Corrigir texto do footer

**Linha 494:** Trocar "a cada 30 segundos" para "a cada 60 segundos" (compativel com o intervalo real de 60000ms na linha 121).

## 3. Atualizar versao do app

### `src/lib/version.ts`
- `APP_VERSION`: '1.8.0' para '1.8.1'
- `APP_BUILD_DATE`: '2026-02-13' para '2026-02-14'

## Resumo de arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/PainelLocalizador.tsx` | Query + logica priorizacao + footer |
| `src/lib/version.ts` | Versao e data |

