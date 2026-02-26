

# Auditoria Completa do Backend - Seguranca e Performance

## Diagnostico Atual

### PROBLEMAS CRITICOS DE SEGURANCA

O linter do Supabase encontrou **18 alertas de seguranca**. O problema principal: **7 tabelas operacionais** usam politicas RLS `USING(true)` para INSERT, UPDATE e DELETE, significando que **qualquer usuario autenticado pode modificar dados de qualquer evento**.

Tabelas vulneraveis:
- `viagens` - qualquer usuario pode criar/editar/deletar viagens de qualquer evento
- `missoes` - dados de missoes VIP expostos (nomes de clientes, horarios, localizacoes)
- `alertas_frota` - alertas podem ser manipulados
- `motorista_presenca` - checkin/checkout podem ser fraudados
- `veiculo_fotos` - fotos podem ser deletadas
- `veiculo_vistoria_historico` - historico de vistorias pode ser alterado
- `viagem_logs` - logs de auditoria sem protecao de escrita

Dados sensiveis expostos:
- `motoristas` - telefone, CNH, localizacao em tempo real legiveis por qualquer pessoa
- `missoes` - detalhes de transporte VIP (nomes, horarios, rotas)

### PROBLEMAS DE PERFORMANCE

1. **Sem indices otimizados** - queries filtram por `evento_id` + `status` + `data_criacao` sem indices compostos
2. **useViagens** busca TODAS as viagens do evento (pode atingir limite de 1000 rows do Supabase)
3. **useMissoes** faz query extra ao evento a cada fetch para buscar `horario_virada_dia`
4. **useLocalizadorMotoristas** faz 3 queries paralelas + escuta 3 canais Realtime no mesmo hook

---

## PLANO DE CORRECAO

### Fase 1: Seguranca RLS (Migracao SQL)

Substituir todas as politicas `USING(true)` por politicas que usam a funcao `has_event_access()` ja existente no banco.

**Principio**: Cada usuario so pode ler/modificar dados dos eventos aos quais esta vinculado em `evento_usuarios`. Admins tem acesso total via `is_admin()`.

```sql
-- VIAGENS: Restringir por evento_id via has_event_access
DROP POLICY "Allow all insert on viagens" ON viagens;
DROP POLICY "Allow all update on viagens" ON viagens;
DROP POLICY "Allow all delete on viagens" ON viagens;
DROP POLICY "Allow all read on viagens" ON viagens;

CREATE POLICY "viagens_select" ON viagens FOR SELECT
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "viagens_insert" ON viagens FOR INSERT
  TO authenticated WITH CHECK (has_event_access(auth.uid(), evento_id));
CREATE POLICY "viagens_update" ON viagens FOR UPDATE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "viagens_delete" ON viagens FOR DELETE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));

-- Mesmo padrao para: missoes, alertas_frota, motorista_presenca,
-- veiculo_fotos, veiculo_vistoria_historico, viagem_logs
```

Total: ~28 politicas substituidas em 7 tabelas.

### Fase 2: Indices de Performance (Migracao SQL)

Criar indices compostos para as queries mais frequentes:

```sql
-- Viagens: filtro principal de todas as telas
CREATE INDEX idx_viagens_evento_status ON viagens(evento_id, status);
CREATE INDEX idx_viagens_evento_criacao ON viagens(evento_id, data_criacao);
CREATE INDEX idx_viagens_evento_motorista ON viagens(evento_id, motorista_id);
CREATE INDEX idx_viagens_missao ON viagens(origem_missao_id) WHERE origem_missao_id IS NOT NULL;

-- Missoes: listagem por evento + status
CREATE INDEX idx_missoes_evento_status ON missoes(evento_id, status);

-- Presenca: consulta diaria
CREATE INDEX idx_presenca_evento_data ON motorista_presenca(evento_id, data);

-- Alertas: filtro por evento + status
CREATE INDEX idx_alertas_evento_status ON alertas_frota(evento_id, status);

-- Motoristas: listagem ativa por evento
CREATE INDEX idx_motoristas_evento_ativo ON motoristas(evento_id) WHERE ativo = true;
```

### Fase 3: Otimizacao de Hooks (Frontend)

**3a. useViagens - Adicionar limite server-side**
- Problema: busca todas as viagens sem `limit`, pode atingir 1000 rows
- Solucao: adicionar `.limit(500)` como safety net (dia operacional ja filtra naturalmente)

**3b. useMissoes - Eliminar query extra ao evento**
- Problema: a cada `fetchMissoes()`, faz uma query separada `SELECT horario_virada_dia FROM eventos`
- Solucao: receber `horarioVirada` como parametro do hook (ja disponivel no componente pai)

**3c. useLocalizadorMotoristas - Reduzir queries**
- Problema: 3 queries paralelas (motoristas + presenca + viagens) + 3 canais Realtime
- Solucao: manter as 3 queries paralelas (ja e eficiente), mas consolidar os 3 canais Realtime em 1 unico canal que escuta as 3 tabelas (ja esta assim, OK)

**3d. useCadastros - Cache ja implementado**
- Cache de 60s com `Map` ja funciona bem. Sem alteracao necessaria.

### Fase 4: Habilitar Leaked Password Protection

No dashboard do Supabase: Authentication > Settings > habilitar "Leaked Password Protection".

---

## RESUMO DE ALTERACOES

| Categoria | Arquivos | Impacto |
|-----------|----------|---------|
| RLS Seguranca | 1 migracao SQL (28 politicas) | Critico - fecha brechas de acesso |
| Indices DB | 1 migracao SQL (8 indices) | Alto - queries 5-10x mais rapidas |
| Hook useMissoes | `src/hooks/useMissoes.ts` | Medio - elimina 1 query por fetch |
| Hook useViagens | `src/hooks/useViagens.ts` | Baixo - safety net de limite |

### Riscos e Consideracoes

- As novas politicas RLS exigem que **todos os usuarios de campo** estejam cadastrados em `evento_usuarios`. Se algum usuario nao estiver vinculado, perdera acesso.
- Os indices nao afetam funcionalidade, apenas performance.
- A funcao `has_event_access()` ja esta pronta e testada no banco - usamos ela como base.

