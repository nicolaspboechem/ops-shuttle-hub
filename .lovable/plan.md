

## Plano: Corrigir PAX em Trânsito no Dashboard CCO + melhorias no Cliente

### Problema principal
No Dashboard CCO, o card "PAX em Trânsito" mostra 175 (consolidado) em vez de 3 (apenas viagens ativas). A causa: o filtro na linha 115-118 usa `!v.h_retorno`, que inclui TODOS os shuttles (que nunca têm retorno), em vez de filtrar apenas viagens realmente ativas.

O Dashboard do Cliente (`ClienteDashboardTab`) já calcula corretamente usando `viagensAtivas`.

### Mudanças

**1. `src/pages/Dashboard.tsx` — Corrigir PAX em Trânsito**
- Remover o `useMemo` customizado `totalPaxAtivas` (linhas 114-119)
- Usar `viagensAtivas` (já calculado pelo `useCalculos`) para somar `qtd_pax`:
  ```ts
  const totalPaxAtivas = useMemo(() =>
    viagensAtivas.reduce((acc, v) => acc + (v.qtd_pax || 0), 0)
  , [viagensAtivas]);
  ```
- Isso alinha com a mesma lógica já usada no Cliente (linha 99-101)

**2. `src/components/app/ClienteDashboardTab.tsx` — Melhorias adicionais**
- Filtrar rotas shuttle por horário ativo (usar `rotaEstaAtiva` como no painel público) no `ClientePainelTab`
- Corrigir `useViagensPublicas` para usar `horario_virada_dia` do evento em vez de meia-noite simples

**3. `src/hooks/useViagensPublicas.ts` — Corrigir dia operacional**
- Importar e usar `getDataOperacional` com o `horario_virada_dia` do evento
- Aceitar `horarioVirada` como parâmetro opcional

### Resultado
- CCO: "PAX em Trânsito" mostra apenas passageiros de viagens realmente ativas (3, não 175)
- Cliente: rotas expiradas não aparecem no painel; dia operacional correto nas viagens públicas

