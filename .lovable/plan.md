
# Otimizacao Completa: Abas Estaticas + Abas Dinamicas

## Mapa atual de requisicoes por pagina

```text
PAGINA                  | HOOKS DE DADOS                    | REALTIME  | POLLING     | LIMITE 1000
------------------------|-----------------------------------|-----------|-------------|------------
Motoristas (cadastro)   | useViagens(dia), useCadastros     | Sim (3s)  | 5min        | Sim (viagens)
Motoristas (auditoria)  | useViagens(dia) [MESMO]           | Sim (3s)  | 5min        | Sim
Veiculos (cadastro)     | useViagens(sem dia), useCadastros  | Sim (3s)  | 5min        | Sim
Veiculos (auditoria)    | useViagens [MESMO]                | Sim (3s)  | 5min        | Sim
Auditoria               | useViagens(sem dia)               | Sim (3s)  | 5min        | Sim
Dashboard               | useViagens(dia)                   | Sim (3s)  | 5min        | Sim (viagens)
Viagens Ativas          | useViagens(dia)                   | Sim (3s)  | 5min        | Sim
Viagens Finalizadas     | useViagens(dia)                   | Sim (3s)  | 5min        | Sim
Localizador             | useLocalizadorMotoristas          | Sim (2s)  | 60s         | Nao (3 queries pequenas)
Mapa de Servico         | useLocalizadorMotoristas          | Sim (2s)  | 30s         | Nao
```

### Problemas identificados

1. **Motoristas.tsx**: `useViagens` com filtro de dia operacional = auditoria vazia quando evento encerrou
2. **Veiculos.tsx e Auditoria.tsx**: `useViagens` sem filtro mas com limite de 1000 rows = dados truncados (3.762 viagens, so mostra 1.000)
3. **Abas estaticas com realtime**: Motoristas/Veiculos/Auditoria tem realtime + polling em dados que so mudam quando ha operacao ativa - desperdicio
4. **Viagens Ativas/Finalizadas**: Cada uma cria sua propria instancia de `useViagens` com realtime separado
5. **Localizador**: Polling de 60s + realtime com debounce de 2s -- ok para tempo real
6. **Mapa de Servico**: Polling de 30s com progress bar + realtime -- ok mas o ticker de 200ms para progress bar e excessivo
7. **useViagens nao diferencia por tipo de operacao no fetch**: Traz tudo e filtra client-side

---

## PARTE A: Abas Estaticas (Motoristas, Veiculos, Auditoria)

### A1. Novo hook `useViagensAuditoria`

**Arquivo**: `src/hooks/useViagensAuditoria.ts` (novo)

- Busca TODAS as viagens do evento usando paginacao automatica (blocos de 1000 via `.range()`)
- Sem realtime, sem polling (dados historicos)
- Cache via `useRef` por `eventoId` -- carrega 1 vez por sessao
- Inclui JOIN com veiculos: `veiculo:veiculos!veiculo_id (nome, placa, tipo_veiculo)`
- Retorna `{ viagens, loading, refetch }`
- Botao manual de "Atualizar" disponivel caso o usuario queira forcar

### A2. Atualizar `Motoristas.tsx`

- Chamar `useViagensAuditoria(eventoId)` 
- Passar `viagensAuditoria` para `MotoristasAuditoria` (linha 1095) ao inves de `viagens`
- Manter `useViagens(eventoId, viagensOptions)` apenas para o kanban de cadastro (status ativo dos motoristas)

### A3. Atualizar `Veiculos.tsx`

- Chamar `useViagensAuditoria(eventoId)`
- Usar `viagensAuditoria` para `VeiculosAuditoria`, `VeiculosUsoAuditoria` e calculo de `veiculosStatsMap`
- Manter `useViagens(eventoId)` para `viagensAtivas` no kanban

### A4. Atualizar `Auditoria.tsx`

- Substituir `useViagens(eventoId)` por `useViagensAuditoria(eventoId)`
- Todas as 4 abas (Resumo, Motoristas, Veiculos, Abastecimento) recebem dataset completo

### A5. Adicionar `OperationTabs` em `MotoristasAuditoria` e `VeiculosAuditoria`

- Filtro por tipo de operacao (transfer/shuttle/missao) -- feito client-side com `useMemo`
- Contadores por tipo nos tabs
- Sem query adicional -- o dataset ja esta completo em memoria

---

## PARTE B: Abas Dinamicas (Localizador, Mapa Servico, Viagens Ativas/Finalizadas, Dashboard)

### B1. Estrategia unificada de refresh

Em vez de cada pagina ter sua propria combinacao de realtime + polling, padronizar:

**Regra**: Realtime como trigger principal (throttled 5s) + polling como fallback de seguranca a cada 2 minutos (120s). Sem polling agressivo de 30s.

### B2. Otimizar `useViagens` para abas dinamicas

Atualmente o `useViagens` tem:
- Realtime com throttle de 3s
- Polling de 5min (300s)

Alteracao:
- Manter realtime com throttle de 5s (ja implementado via `refetchThrottle`)
- Reduzir polling de 5min para 2min (120s) conforme solicitado
- Isso afeta: Dashboard, Viagens Ativas, Viagens Finalizadas

### B3. Otimizar `useLocalizadorMotoristas`

Atualmente:
- Realtime com debounce de 2s
- PainelLocalizador: polling de 60s
- MapaServico: polling de 30s com ticker de 200ms

Alteracao:
- Aumentar debounce do realtime de 2s para 3s (reduz bursts)
- Unificar polling para 120s (2 min) em ambas as paginas
- MapaServico: Manter progress bar visual mas com ticker de 1s em vez de 200ms (5x menos re-renders)

### B4. Otimizar `useLocalizadorVeiculos`

Mesmo padrao do motoristas:
- Debounce de 3s no realtime
- Sem polling proprio (quem chama controla)

### B5. Otimizar `PainelLocalizador.tsx`

- Mudar polling de 60s para 120s
- Missoes: realtime ja cobre atualizacoes instantaneas, polling desnecessario

### B6. Otimizar `MapaServico.tsx`

- Mudar `REFRESH_INTERVAL` de 30s para 120s
- Ticker da progress bar: de 200ms para 1000ms
- Resultado: ~150 re-renders a menos por ciclo de refresh

### B7. Dashboard e Viagens -- sem mudanca estrutural

Ja usam `useViagens` que sera ajustado em B2. O polling passara de 5min para 2min automaticamente.

---

## Resumo de economia de requisicoes

```text
PAGINA              | ANTES (req/hora)           | DEPOIS (req/hora)
--------------------|----------------------------|---------------------------
Motoristas (audit)  | ~720 (realtime) + 12 (poll)| 0 (cache, sem realtime)
Veiculos (audit)    | ~720 + 12                  | 0
Auditoria           | ~720 + 12                  | 0
Dashboard           | ~720 + 12                  | ~720 (RT) + 30 (poll 2min)
Viagens Ativas      | ~720 + 12                  | ~720 + 30
Viagens Finalizadas | ~720 + 12                  | ~720 + 30
Localizador         | ~720 + 60                  | ~720 + 30
Mapa de Servico     | ~720 + 120                 | ~720 + 30
```

As abas de auditoria passam de ~1.400 req/hora para 1 (carga inicial). As abas dinamicas mantem realtime mas com polling mais esparcado.

---

## Tabela de cache por pagina

```text
PAGINA                  | CACHE         | REALTIME | POLLING  | PAGINACAO
------------------------|---------------|----------|----------|----------
Motoristas (cadastro)   | 60s (existente)| Sim (5s) | 2min     | Nao (< 200 rows)
Motoristas (auditoria)  | useRef sessao | Nao      | Nao      | Sim (1000/bloco)
Veiculos (cadastro)     | 60s (existente)| Sim (5s) | 2min     | Nao (< 200 rows)
Veiculos (auditoria)    | useRef sessao | Nao      | Nao      | Sim (1000/bloco)
Auditoria               | useRef sessao | Nao      | Nao      | Sim (1000/bloco)
Dashboard               | Nenhum        | Sim (5s) | 2min     | Nao (filtro dia)
Viagens Ativas          | Nenhum        | Sim (5s) | 2min     | Nao (filtro dia)
Viagens Finalizadas     | Nenhum        | Sim (5s) | 2min     | Nao (filtro dia)
Localizador             | Nenhum        | Sim (3s) | 2min     | Nao (3 queries)
Mapa de Servico         | Nenhum        | Sim (3s) | 2min     | Nao (3 queries)
```

---

## Sequencia de execucao

| Ordem | Acao | Arquivos |
|-------|------|----------|
| 1 | Criar `useViagensAuditoria` com paginacao e cache | `src/hooks/useViagensAuditoria.ts` (novo) |
| 2 | Atualizar Motoristas para usar hook de auditoria | `src/pages/Motoristas.tsx` |
| 3 | Atualizar Veiculos para usar hook de auditoria | `src/pages/Veiculos.tsx` |
| 4 | Atualizar Auditoria para usar hook de auditoria | `src/pages/Auditoria.tsx` |
| 5 | Adicionar OperationTabs nas auditorias | `src/components/motoristas/MotoristasAuditoria.tsx`, `src/components/veiculos/VeiculosAuditoria.tsx` |
| 6 | Ajustar polling do useViagens (5min para 2min) | `src/hooks/useViagens.ts` |
| 7 | Ajustar debounce/polling do Localizador | `src/hooks/useLocalizadorMotoristas.ts`, `src/hooks/useLocalizadorVeiculos.ts` |
| 8 | Ajustar polling do PainelLocalizador | `src/pages/PainelLocalizador.tsx` |
| 9 | Ajustar polling e ticker do MapaServico | `src/pages/MapaServico.tsx` |

## Total de arquivos modificados: 10

**Novo**: 1 (`useViagensAuditoria.ts`)
**Modificados**: 9
