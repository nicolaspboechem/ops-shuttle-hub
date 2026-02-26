
-- ============================================================
-- FASE 1: SEGURANÇA RLS - Substituir USING(true) por has_event_access()
-- ============================================================

-- 1. VIAGENS
DROP POLICY IF EXISTS "Allow all delete on viagens" ON viagens;
DROP POLICY IF EXISTS "Allow all insert on viagens" ON viagens;
DROP POLICY IF EXISTS "Allow all read on viagens" ON viagens;
DROP POLICY IF EXISTS "Allow all update on viagens" ON viagens;

CREATE POLICY "viagens_select" ON viagens FOR SELECT
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "viagens_insert" ON viagens FOR INSERT
  TO authenticated WITH CHECK (has_event_access(auth.uid(), evento_id));
CREATE POLICY "viagens_update" ON viagens FOR UPDATE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "viagens_delete" ON viagens FOR DELETE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));

-- 2. MISSOES
DROP POLICY IF EXISTS "Allow all delete on missoes" ON missoes;
DROP POLICY IF EXISTS "Allow all insert on missoes" ON missoes;
DROP POLICY IF EXISTS "Allow all read on missoes" ON missoes;
DROP POLICY IF EXISTS "Allow all update on missoes" ON missoes;

CREATE POLICY "missoes_select" ON missoes FOR SELECT
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "missoes_insert" ON missoes FOR INSERT
  TO authenticated WITH CHECK (has_event_access(auth.uid(), evento_id));
CREATE POLICY "missoes_update" ON missoes FOR UPDATE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "missoes_delete" ON missoes FOR DELETE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));

-- 3. ALERTAS_FROTA
DROP POLICY IF EXISTS "Allow all delete on alertas_frota" ON alertas_frota;
DROP POLICY IF EXISTS "Allow all insert on alertas_frota" ON alertas_frota;
DROP POLICY IF EXISTS "Allow all read on alertas_frota" ON alertas_frota;
DROP POLICY IF EXISTS "Allow all update on alertas_frota" ON alertas_frota;

CREATE POLICY "alertas_frota_select" ON alertas_frota FOR SELECT
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "alertas_frota_insert" ON alertas_frota FOR INSERT
  TO authenticated WITH CHECK (has_event_access(auth.uid(), evento_id));
CREATE POLICY "alertas_frota_update" ON alertas_frota FOR UPDATE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "alertas_frota_delete" ON alertas_frota FOR DELETE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));

-- 4. MOTORISTA_PRESENCA
DROP POLICY IF EXISTS "Allow all operations on motorista_presenca" ON motorista_presenca;

CREATE POLICY "motorista_presenca_select" ON motorista_presenca FOR SELECT
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "motorista_presenca_insert" ON motorista_presenca FOR INSERT
  TO authenticated WITH CHECK (has_event_access(auth.uid(), evento_id));
CREATE POLICY "motorista_presenca_update" ON motorista_presenca FOR UPDATE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "motorista_presenca_delete" ON motorista_presenca FOR DELETE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));

-- 5. VEICULO_FOTOS (não tem evento_id direto, precisa resolver via veiculos)
DROP POLICY IF EXISTS "Allow all delete on veiculo_fotos" ON veiculo_fotos;
DROP POLICY IF EXISTS "Allow all insert on veiculo_fotos" ON veiculo_fotos;
DROP POLICY IF EXISTS "Allow all read on veiculo_fotos" ON veiculo_fotos;
DROP POLICY IF EXISTS "Allow all update on veiculo_fotos" ON veiculo_fotos;

CREATE POLICY "veiculo_fotos_select" ON veiculo_fotos FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), (SELECT evento_id FROM veiculos WHERE id = veiculo_id))
  );
CREATE POLICY "veiculo_fotos_insert" ON veiculo_fotos FOR INSERT
  TO authenticated WITH CHECK (
    has_event_access(auth.uid(), (SELECT evento_id FROM veiculos WHERE id = veiculo_id))
  );
CREATE POLICY "veiculo_fotos_update" ON veiculo_fotos FOR UPDATE
  TO authenticated USING (
    has_event_access(auth.uid(), (SELECT evento_id FROM veiculos WHERE id = veiculo_id))
  );
CREATE POLICY "veiculo_fotos_delete" ON veiculo_fotos FOR DELETE
  TO authenticated USING (
    has_event_access(auth.uid(), (SELECT evento_id FROM veiculos WHERE id = veiculo_id))
  );

-- 6. VEICULO_VISTORIA_HISTORICO
DROP POLICY IF EXISTS "Allow delete on veiculo_vistoria_historico" ON veiculo_vistoria_historico;
DROP POLICY IF EXISTS "Allow insert on veiculo_vistoria_historico" ON veiculo_vistoria_historico;
DROP POLICY IF EXISTS "Allow select on veiculo_vistoria_historico" ON veiculo_vistoria_historico;
DROP POLICY IF EXISTS "Allow update on veiculo_vistoria_historico" ON veiculo_vistoria_historico;

CREATE POLICY "vistoria_historico_select" ON veiculo_vistoria_historico FOR SELECT
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "vistoria_historico_insert" ON veiculo_vistoria_historico FOR INSERT
  TO authenticated WITH CHECK (has_event_access(auth.uid(), evento_id));
CREATE POLICY "vistoria_historico_update" ON veiculo_vistoria_historico FOR UPDATE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));
CREATE POLICY "vistoria_historico_delete" ON veiculo_vistoria_historico FOR DELETE
  TO authenticated USING (has_event_access(auth.uid(), evento_id));

-- 7. VIAGEM_LOGS (não tem evento_id direto, resolve via viagens)
DROP POLICY IF EXISTS "Allow all read on viagem_logs" ON viagem_logs;
DROP POLICY IF EXISTS "Allow insert on viagem_logs" ON viagem_logs;

CREATE POLICY "viagem_logs_select" ON viagem_logs FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), (SELECT evento_id FROM viagens WHERE id = viagem_id))
  );
CREATE POLICY "viagem_logs_insert" ON viagem_logs FOR INSERT
  TO authenticated WITH CHECK (
    has_event_access(auth.uid(), (SELECT evento_id FROM viagens WHERE id = viagem_id))
  );

-- 8. MOTORISTAS - Restringir SELECT a membros do evento (dados sensíveis: telefone, CNH, localização)
DROP POLICY IF EXISTS "motoristas_select_public" ON motoristas;

CREATE POLICY "motoristas_select_event" ON motoristas FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), evento_id)
  );

-- 9. VEICULOS - Restringir SELECT a membros do evento
DROP POLICY IF EXISTS "veiculos_select_public" ON veiculos;

CREATE POLICY "veiculos_select_event" ON veiculos FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), evento_id)
  );

-- 10. PONTOS_EMBARQUE - Restringir SELECT a membros do evento
DROP POLICY IF EXISTS "pontos_embarque_select_public" ON pontos_embarque;

CREATE POLICY "pontos_embarque_select_event" ON pontos_embarque FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), evento_id)
  );

-- 11. ROTAS_SHUTTLE - Restringir SELECT a membros do evento
DROP POLICY IF EXISTS "rotas_shuttle_select_public" ON rotas_shuttle;

CREATE POLICY "rotas_shuttle_select_event" ON rotas_shuttle FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), evento_id)
  );

-- 12. ESCALAS - Restringir SELECT a membros do evento
DROP POLICY IF EXISTS "escalas_select_public" ON escalas;

CREATE POLICY "escalas_select_event" ON escalas FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), evento_id)
  );

-- 13. ESCALA_MOTORISTAS - Restringir SELECT via escala -> evento
DROP POLICY IF EXISTS "escala_motoristas_select_public" ON escala_motoristas;

CREATE POLICY "escala_motoristas_select_event" ON escala_motoristas FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), (SELECT evento_id FROM escalas WHERE id = escala_id))
  );

-- 14. EVENTO_USUARIOS - Restringir SELECT a membros do evento (não expor lista de usuários)
DROP POLICY IF EXISTS "evento_usuarios_select_public" ON evento_usuarios;

CREATE POLICY "evento_usuarios_select_event" ON evento_usuarios FOR SELECT
  TO authenticated USING (
    has_event_access(auth.uid(), evento_id)
  );

-- ============================================================
-- FASE 2: ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_viagens_evento_status ON viagens(evento_id, status);
CREATE INDEX IF NOT EXISTS idx_viagens_evento_criacao ON viagens(evento_id, data_criacao);
CREATE INDEX IF NOT EXISTS idx_viagens_evento_motorista ON viagens(evento_id, motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_missao ON viagens(origem_missao_id) WHERE origem_missao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missoes_evento_status ON missoes(evento_id, status);

CREATE INDEX IF NOT EXISTS idx_presenca_evento_data ON motorista_presenca(evento_id, data);

CREATE INDEX IF NOT EXISTS idx_alertas_evento_status ON alertas_frota(evento_id, status);

CREATE INDEX IF NOT EXISTS idx_motoristas_evento_ativo ON motoristas(evento_id) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_veiculo_fotos_veiculo ON veiculo_fotos(veiculo_id);

CREATE INDEX IF NOT EXISTS idx_viagem_logs_viagem ON viagem_logs(viagem_id);

CREATE INDEX IF NOT EXISTS idx_evento_usuarios_user ON evento_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_evento_usuarios_evento ON evento_usuarios(evento_id);
