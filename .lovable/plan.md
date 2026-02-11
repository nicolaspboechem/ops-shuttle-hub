

# Corrigir Auto-Atualização do Localizador

## Diagnóstico

O Localizador já possui dois mecanismos de atualização automática:
- **Supabase Realtime** (instantâneo) -- escuta mudanças nas tabelas `motoristas`, `viagens` e `motorista_presenca`
- **Polling a cada 30 segundos** -- intervalo que chama `refetch()`

O problema: quando o navegador fica em segundo plano (aba inativa), o Chrome suspende timers e pode desconectar o WebSocket silenciosamente. Ao voltar para a aba, nada atualiza até o próximo ciclo do timer (que também pode estar pausado).

## Solução

Adicionar um listener de `visibilitychange` no hook `useLocalizadorMotoristas` (e opcionalmente no `useLocalizadorVeiculos`). Quando o usuário voltar para a aba, dispara um `refetch()` imediato.

## Alterações

### Arquivo: `src/hooks/useLocalizadorMotoristas.ts`

Adicionar um `useEffect` com listener de `visibilitychange`:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && eventoId) {
      fetchMotoristas();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [eventoId, fetchMotoristas]);
```

### Arquivo: `src/hooks/useLocalizadorVeiculos.ts`

Mesmo padrão -- adicionar listener de `visibilitychange` para chamar `fetchVeiculos()` ao retornar à aba.

## Custos e Performance

- **Impacto zero em custo**: nenhuma query adicional em uso normal. Só dispara uma query extra quando o usuário volta para a aba (evento raro).
- **Intervalo de 30s mantido**: é o equilíbrio ideal entre atualização e economia. Reduzir para 10s triplicaria as queries sem benefício real, já que o Realtime já cobre mudanças instantâneas.
- **WebSocket Realtime**: sem custo adicional no Supabase, usa uma única conexão persistente.

## Resumo

| Mecanismo | Latência | Custo |
|-----------|----------|-------|
| Realtime (WebSocket) | Instantâneo | Zero extra |
| Polling 30s | Até 30s | 2 queries/min |
| Visibility change (novo) | Ao voltar à aba | 1 query pontual |

