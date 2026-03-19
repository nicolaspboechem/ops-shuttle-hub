

# Plano de Correção — Auditoria ops-shuttle-hub

## Resumo Executivo

| Tipo | Alta | Media | Baixa | Total |
|------|------|-------|-------|-------|
| Codigo Morto | 3 | 2 | 1 | 6 |
| Inconsistencia | 3 | 1 | 0 | 4 |
| Sobreposicao | 0 | 2 | 0 | 2 |
| Seguranca | 0 | 2 | 1 | 3 |
| Bug | 1 | 0 | 0 | 1 |
| **Total** | **7** | **7** | **2** | **16** |

---

## Tabela de Risco e Impacto por Ação

| # | Ação | Risco de Quebra | Impacto Operacional | Justificativa |
|---|------|:-:|:-:|---|
| **Batch 1 — Transfer cleanup** | | | | |
| 1 | Remover `'transfer'` de `TipoOperacao` em `viagem.ts` | 🟡 Medio | 🔴 Alto | Se algum código ainda compara com `'transfer'`, TS vai acusar erro — bom. Mas se houver dados antigos no banco com esse valor, queries podem falhar silenciosamente |
| 2 | Default `'shuttle'` em `CreateViagemForm.tsx` | 🟢 Baixo | 🔴 Alto | Corrige criação de viagens com tipo morto. Sem risco — apenas muda valor default |
| 3 | Default `'shuttle'` em `CreateViagemMotoristaForm.tsx` | 🟢 Baixo | 🔴 Alto | Mesmo caso acima |
| 4 | Fallback badge → `'Shuttle'` em `ViagensTable.tsx` | 🟢 Baixo | 🟡 Medio | Cosmético — evita label errado para tipos desconhecidos |
| 5 | Fallback → `'Shuttle'` em `MotoristaHistoricoTab.tsx` | 🟢 Baixo | 🟡 Medio | Cosmético |
| 6 | Remover contador transfer em `MotoristasAuditoria.tsx` | 🟢 Baixo | 🟡 Medio | Linha sempre retorna 0 — remover limpa a UI |
| 7 | Remover contador transfer em `VeiculosAuditoria.tsx` | 🟢 Baixo | 🟡 Medio | Mesmo caso |
| **Batch 2 — Badges e modais** | | | | |
| 8 | Remover entry transfer em `PresencaDiaModal.tsx` | 🟢 Baixo | 🟢 Baixo | Apenas remove badge config não utilizado |
| 9 | Remover entry transfer em `VeiculoAuditoriaDiaModal.tsx` | 🟢 Baixo | 🟢 Baixo | Mesmo caso |
| **Batch 3 — Suporte/FAQ** | | | | |
| 10 | Remover seções Transfer de `Suporte.tsx` | 🟢 Baixo | 🟡 Medio | Conteúdo informativo desatualizado confunde operadores |
| 11 | Atualizar texto `faqData.ts` | 🟢 Baixo | 🟢 Baixo | Texto apenas |
| **Batch 4 — Código morto** | | | | |
| 12 | Deletar `auto-checkout/index.ts` | 🟢 Baixo | 🟢 Baixo | Nenhum frontend invoca. Confirmado por search. Mas precisa remover do deploy também |
| 13 | Remover de `config.toml` | 🟢 Baixo | 🟢 Baixo | Acompanha item 12 |
| **Batch 5 — Segurança** | | | | |
| 14 | Migrar hardcoded keys para env vars em `client.ts` | 🟡 Medio | 🟡 Medio | Se `.env` não estiver configurado no deploy (Vercel), app quebra em produção. Precisa confirmar que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` existem no ambiente de deploy |
| **Batch 6 — Notificações** | | | | |
| 15 | Trocar filtro `motorista !== 'Shuttle'` por `tipo_operacao` em `useNotifications.tsx` | 🟡 Medio | 🔴 Alto | Operadores podem começar a receber notificações de shuttle que antes eram silenciadas — pode gerar excesso de alertas. Testar volume antes |

### Ações NÃO recomendadas agora

| Ação | Risco de Quebra | Justificativa para adiar |
|------|:-:|---|
| Ativar `strictNullChecks` | 🔴 Alto | Centenas de erros de compilação. Requer refactor dedicado de 2-3 dias |
| Restringir CORS nas Edge Functions | 🟡 Medio | Precisa mapear todos os domínios que consomem as APIs (preview, produção, mobile). Risco de bloquear acesso legítimo |
| Refatorar `close-open-trips` | 🟡 Medio | Função monolítica mas funcional. Quebrar em partes menores tem risco de introduzir race conditions novas |

---

## Ordem de Execução Recomendada

```text
Batch 1 (Transfer cleanup)     → 7 arquivos, risco baixo, impacto alto
  ↓
Batch 2 (Badges)               → 2 arquivos, risco baixo
  ↓
Batch 3 (Suporte/FAQ)          → 2 arquivos, risco baixo
  ↓
Batch 4 (auto-checkout morto)  → 1 file + config, risco baixo
  ↓
Batch 5 (env vars)             → 1 arquivo, verificar deploy antes
  ↓
Batch 6 (notificações)         → 1 arquivo, testar volume antes
```

Batches 1-4 podem ser executados juntos com segurança. Batch 5 requer verificação do ambiente de deploy. Batch 6 requer validação de volume de notificações com o time operacional.

