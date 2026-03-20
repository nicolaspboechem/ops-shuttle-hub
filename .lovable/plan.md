

## Diagnóstico: Viagem encerrada por um operador ainda aparece ativa para outro

### Causa raiz identificada

O hook `useViagens` (que alimenta o app do operador) **não tem um listener de `visibilitychange`**. Todos os outros hooks críticos (Localizador, Notificações, ServerTime) possuem esse listener, mas o `useViagens` não.

**O que acontece na prática:**

1. Operador A encerra uma viagem → banco atualiza
2. Operador B está com o app em segundo plano (tela bloqueada, outra aba, outro app)
3. O navegador **suspende** o WebSocket do Supabase Realtime e os timers de polling
4. Quando Operador B volta ao app, ele vê dados **stale** (antigos)
5. Só atualiza quando: (a) o Realtime reconecta e dispara um evento, ou (b) o polling de 2 minutos ocorre

Além disso, o throttle de 5 segundos com burst detection pode coalescer eventos quando múltiplas viagens são atualizadas rapidamente, atrasando a propagação.

### Plano de correção

**1. Adicionar `visibilitychange` ao `useViagens`** (`src/hooks/useViagens.ts`)
- Quando o usuário retorna à aba/app, forçar `fetchViagens(false)` imediatamente
- Mesmo padrão já usado em `useLocalizadorVeiculos`, `useLocalizadorMotoristas`, etc.
- Aplicar tanto no `useViagens` quanto no `useViagensPorMotorista`

**2. Reduzir polling fallback de 120s para 60s**
- 2 minutos é longo demais para operação em tempo real de campo
- Alinhar com o intervalo usado em outros hooks operacionais

### Resultado esperado
- Ao voltar ao app, dados atualizam instantaneamente
- Polling mais frequente como rede de segurança adicional
- Viagens encerradas por outro operador desaparecem da lista ativa em < 1 segundo ao retornar ao app

### Detalhes técnicos

Arquivo: `src/hooks/useViagens.ts`

No `useViagens`:
- Adicionar `useEffect` com `visibilitychange` → `fetchViagens(false)` (dentro do bloco existente ou em efeito separado)
- Alterar intervalo de polling de `120000` para `60000`

No `useViagensPorMotorista`:
- Mesmo tratamento: adicionar `visibilitychange` listener

