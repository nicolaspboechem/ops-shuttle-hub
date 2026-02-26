
# Tipos de Viagem Configuráveis por Evento

## Resumo

Hoje o sistema tem um campo `tipo_operacao` (transfer/shuttle) e um toggle separado `habilitar_missoes`. A proposta e substituir isso por um campo multi-selecao `tipos_viagem_habilitados` que controla quais tipos de viagem estao disponiveis no evento. Isso afeta: criacao de evento, edicao de evento, OperationTabs (abas Missao/Transfer/Shuttle), criacao de viagens no app (Supervisor/Operador), e o CCO.

## Mudancas no Banco de Dados

Nova coluna na tabela `eventos`:

```text
tipos_viagem_habilitados TEXT[] DEFAULT '{missao}'
```

Essa coluna armazena um array de strings com os tipos habilitados: `missao`, `transfer`, `shuttle`. Exemplos: `{missao}`, `{transfer,shuttle}`, `{missao,transfer,shuttle}`.

Os campos legados `tipo_operacao` e `habilitar_missoes` permanecem na tabela por compatibilidade mas deixam de ser a fonte de verdade.

Migration SQL:
- Adicionar coluna `tipos_viagem_habilitados`
- Popular valores iniciais baseado nos campos existentes (`tipo_operacao` + `habilitar_missoes`)

## Alteracoes por Arquivo

### 1. Migration SQL
- Criar coluna `tipos_viagem_habilitados TEXT[] DEFAULT '{missao}'`
- Script de migracao para popular baseado nos dados atuais

### 2. `src/components/eventos/CreateEventoWizard.tsx`
- Substituir o RadioGroup de tipo_operacao (transfer/shuttle/ambos) por um grupo de checkboxes multi-selecao com 3 opcoes: Missao, Transfer, Shuttle
- Remover o toggle separado `habilitar_missoes` do step 4 (agora esta integrado no step 1)
- Ao salvar, gravar o array `tipos_viagem_habilitados` na tabela
- Manter `tipo_operacao` e `habilitar_missoes` sincronizados para compatibilidade

### 3. `src/components/eventos/EditEventoModal.tsx`
- Na aba Config, substituir o Select de tipo_operacao + toggle de missoes por checkboxes multi-selecao
- Mesma logica de sincronizacao com campos legados

### 4. `src/components/layout/OperationTabs.tsx`
- Adicionar prop opcional `tiposHabilitados?: string[]`
- Renderizar apenas as abas cujos tipos estao no array
- Se so 1 tipo habilitado, nao renderizar abas (exibir direto)
- Auto-selecionar o primeiro tipo habilitado como default

### 5. `src/pages/Dashboard.tsx`
- Buscar `tipos_viagem_habilitados` do evento
- Passar para OperationTabs e DashboardMobile
- Default do `tipoOperacao` = primeiro tipo habilitado

### 6. `src/pages/Auditoria.tsx`
- Mesma logica: buscar tipos habilitados, passar para OperationTabs

### 7. `src/pages/ViagensAtivas.tsx` e `src/pages/ViagensFinalizadas.tsx`
- Mesma logica de filtrar abas por tipos habilitados

### 8. `src/components/app/NewActionModal.tsx` (Supervisor)
- Receber `tiposHabilitados` como prop
- Mostrar apenas os botoes de tipos habilitados para o evento
- Missao e Deslocamento aparecem juntos (se missao habilitada)

### 9. `src/pages/app/AppSupervisor.tsx`
- Buscar `tipos_viagem_habilitados` do evento
- Passar para NewActionModal

### 10. `src/pages/app/AppOperador.tsx`
- Condicionar criacao de shuttle apenas se shuttle estiver habilitado
- Se evento tiver transfer habilitado, permitir criar transfer tambem

### 11. `src/pages/Motoristas.tsx`
- Confirmar que NAO tem OperationTabs (ja confirmado - nao tem)
- Motoristas continuam exclusivos do modulo de Missoes, sem filtro por tipo

### 12. `src/components/auditoria/AuditoriaMotoristasTab.tsx` e `AuditoriaVeiculosTab.tsx`
- Filtrar abas OperationTabs pelos tipos habilitados do evento

### 13. `src/lib/types/viagem.ts`
- Adicionar campo `tipos_viagem_habilitados?: string[] | null` na interface Evento

### 14. `src/integrations/supabase/types.ts`
- Sera atualizado automaticamente apos migration

## Regras de Negocio

- Pelo menos 1 tipo deve estar selecionado ao criar/editar evento
- Missao = motorista aceita/inicia. Transfer e Shuttle = operador/supervisor/admin criam
- Shuttle: confirma chegada e confirma retorno (lifecycle completo, nao mais registro instantaneo)
- As abas Missao/Transfer/Shuttle so aparecem se habilitadas no evento
- Se apenas 1 tipo habilitado, as abas nao aparecem (desnecessario)

## Ordem de Implementacao

1. Migration SQL (nova coluna + populacao)
2. Types (viagem.ts)
3. OperationTabs (prop tiposHabilitados)
4. CreateEventoWizard e EditEventoModal
5. Dashboard, Auditoria, ViagensAtivas, ViagensFinalizadas
6. NewActionModal + AppSupervisor + AppOperador
7. Auditorias internas (MotoristasAuditoria, VeiculosAuditoria)
