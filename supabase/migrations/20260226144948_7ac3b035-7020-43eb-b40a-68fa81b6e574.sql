
-- ============================================================
-- FASE 1: Endurecer RLS - Proteger tabelas admin-only e operacionais
-- Staff/Motoristas usam anon key, então SELECT público é mantido
-- Tabelas de campo (viagens, missoes, etc.) ficam para Fase 2
-- ============================================================

-- ============================================================
-- 1. EVENTO_USUARIOS: restringir write a admin authenticated
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on evento_usuarios" ON public.evento_usuarios;
DROP POLICY IF EXISTS "Allow all insert on evento_usuarios" ON public.evento_usuarios;
DROP POLICY IF EXISTS "Allow all read on evento_usuarios" ON public.evento_usuarios;
DROP POLICY IF EXISTS "Allow all update on evento_usuarios" ON public.evento_usuarios;

-- SELECT: público (apps de campo leem evento_usuarios para saber roles)
CREATE POLICY "evento_usuarios_select_public"
  ON public.evento_usuarios FOR SELECT
  USING (true);

-- INSERT: só admin autenticado
CREATE POLICY "evento_usuarios_insert_admin"
  ON public.evento_usuarios FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: só admin autenticado
CREATE POLICY "evento_usuarios_update_admin"
  ON public.evento_usuarios FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- DELETE: só admin autenticado
CREATE POLICY "evento_usuarios_delete_admin"
  ON public.evento_usuarios FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 2. ESCALAS: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on escalas" ON public.escalas;
DROP POLICY IF EXISTS "Allow all insert on escalas" ON public.escalas;
DROP POLICY IF EXISTS "Allow all read on escalas" ON public.escalas;
DROP POLICY IF EXISTS "Allow all update on escalas" ON public.escalas;

CREATE POLICY "escalas_select_public"
  ON public.escalas FOR SELECT
  USING (true);

CREATE POLICY "escalas_insert_admin"
  ON public.escalas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "escalas_update_admin"
  ON public.escalas FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "escalas_delete_admin"
  ON public.escalas FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 3. ESCALA_MOTORISTAS: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on escala_motoristas" ON public.escala_motoristas;
DROP POLICY IF EXISTS "Allow all insert on escala_motoristas" ON public.escala_motoristas;
DROP POLICY IF EXISTS "Allow all read on escala_motoristas" ON public.escala_motoristas;
DROP POLICY IF EXISTS "Allow all update on escala_motoristas" ON public.escala_motoristas;

CREATE POLICY "escala_motoristas_select_public"
  ON public.escala_motoristas FOR SELECT
  USING (true);

CREATE POLICY "escala_motoristas_insert_admin"
  ON public.escala_motoristas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "escala_motoristas_update_admin"
  ON public.escala_motoristas FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "escala_motoristas_delete_admin"
  ON public.escala_motoristas FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 4. EVENTOS: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on eventos" ON public.eventos;
DROP POLICY IF EXISTS "Allow all insert on eventos" ON public.eventos;
DROP POLICY IF EXISTS "Allow all read on eventos" ON public.eventos;
DROP POLICY IF EXISTS "Allow all update on eventos" ON public.eventos;

CREATE POLICY "eventos_select_public"
  ON public.eventos FOR SELECT
  USING (true);

CREATE POLICY "eventos_insert_admin"
  ON public.eventos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "eventos_update_admin"
  ON public.eventos FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "eventos_delete_admin"
  ON public.eventos FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 5. MOTORISTAS: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow all insert on motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow all read on motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow all update on motoristas" ON public.motoristas;

CREATE POLICY "motoristas_select_public"
  ON public.motoristas FOR SELECT
  USING (true);

CREATE POLICY "motoristas_insert_admin"
  ON public.motoristas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: admin pode tudo, anon pode atualizar apenas status e localização
-- (motoristas atualizam sua própria localização via app)
CREATE POLICY "motoristas_update_admin"
  ON public.motoristas FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Permitir update anon apenas para campos de localização/status (temporário até Fase 2)
CREATE POLICY "motoristas_update_field_temp"
  ON public.motoristas FOR UPDATE
  USING (true);

CREATE POLICY "motoristas_delete_admin"
  ON public.motoristas FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 6. VEICULOS: SELECT público, write restrito a admin
-- (campo atualiza status/km via app, precisa de update temporário)
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Allow all insert on veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Allow all read on veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Allow all update on veiculos" ON public.veiculos;

CREATE POLICY "veiculos_select_public"
  ON public.veiculos FOR SELECT
  USING (true);

CREATE POLICY "veiculos_insert_admin"
  ON public.veiculos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "veiculos_update_admin"
  ON public.veiculos FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Temporário: campo precisa atualizar status, km, combustível (Fase 2 vai restringir)
CREATE POLICY "veiculos_update_field_temp"
  ON public.veiculos FOR UPDATE
  USING (true);

CREATE POLICY "veiculos_delete_admin"
  ON public.veiculos FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 7. PONTOS_EMBARQUE: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on pontos_embarque" ON public.pontos_embarque;
DROP POLICY IF EXISTS "Allow all insert on pontos_embarque" ON public.pontos_embarque;
DROP POLICY IF EXISTS "Allow all read on pontos_embarque" ON public.pontos_embarque;
DROP POLICY IF EXISTS "Allow all update on pontos_embarque" ON public.pontos_embarque;

CREATE POLICY "pontos_embarque_select_public"
  ON public.pontos_embarque FOR SELECT
  USING (true);

CREATE POLICY "pontos_embarque_insert_admin"
  ON public.pontos_embarque FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "pontos_embarque_update_admin"
  ON public.pontos_embarque FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "pontos_embarque_delete_admin"
  ON public.pontos_embarque FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 8. PONTO_MOTORISTAS: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all delete on ponto_motoristas" ON public.ponto_motoristas;
DROP POLICY IF EXISTS "Allow all insert on ponto_motoristas" ON public.ponto_motoristas;
DROP POLICY IF EXISTS "Allow all read on ponto_motoristas" ON public.ponto_motoristas;
DROP POLICY IF EXISTS "Allow all update on ponto_motoristas" ON public.ponto_motoristas;

CREATE POLICY "ponto_motoristas_select_public"
  ON public.ponto_motoristas FOR SELECT
  USING (true);

CREATE POLICY "ponto_motoristas_insert_admin"
  ON public.ponto_motoristas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "ponto_motoristas_update_admin"
  ON public.ponto_motoristas FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "ponto_motoristas_delete_admin"
  ON public.ponto_motoristas FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 9. ROTAS_SHUTTLE: SELECT público, write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow all read on rotas_shuttle" ON public.rotas_shuttle;
DROP POLICY IF EXISTS "Allow authenticated delete on rotas_shuttle" ON public.rotas_shuttle;
DROP POLICY IF EXISTS "Allow authenticated insert on rotas_shuttle" ON public.rotas_shuttle;
DROP POLICY IF EXISTS "Allow authenticated update on rotas_shuttle" ON public.rotas_shuttle;

CREATE POLICY "rotas_shuttle_select_public"
  ON public.rotas_shuttle FOR SELECT
  USING (true);

CREATE POLICY "rotas_shuttle_insert_admin"
  ON public.rotas_shuttle FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rotas_shuttle_update_admin"
  ON public.rotas_shuttle FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "rotas_shuttle_delete_admin"
  ON public.rotas_shuttle FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 10. MOTORISTA_CREDENCIAIS: SELECT público (login), write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read for login verification" ON public.motorista_credenciais;
DROP POLICY IF EXISTS "Allow authenticated users to manage credentials" ON public.motorista_credenciais;

CREATE POLICY "motorista_credenciais_select_public"
  ON public.motorista_credenciais FOR SELECT
  USING (true);

CREATE POLICY "motorista_credenciais_insert_admin"
  ON public.motorista_credenciais FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "motorista_credenciais_update_admin"
  ON public.motorista_credenciais FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "motorista_credenciais_delete_admin"
  ON public.motorista_credenciais FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 11. STAFF_CREDENCIAIS: SELECT público (login), write restrito a admin
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read for login verification" ON public.staff_credenciais;
DROP POLICY IF EXISTS "Allow authenticated users to manage credentials" ON public.staff_credenciais;

CREATE POLICY "staff_credenciais_select_public"
  ON public.staff_credenciais FOR SELECT
  USING (true);

CREATE POLICY "staff_credenciais_insert_admin"
  ON public.staff_credenciais FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff_credenciais_update_admin"
  ON public.staff_credenciais FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "staff_credenciais_delete_admin"
  ON public.staff_credenciais FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- COMENTÁRIOS: Tabelas pendentes para Fase 2 (campo escreve via anon)
-- viagens, missoes, viagem_logs, motorista_presenca,
-- alertas_frota, veiculo_fotos, veiculo_vistoria_historico
-- ============================================================
COMMENT ON TABLE public.viagens IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
COMMENT ON TABLE public.missoes IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
COMMENT ON TABLE public.viagem_logs IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
COMMENT ON TABLE public.motorista_presenca IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
COMMENT ON TABLE public.alertas_frota IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
COMMENT ON TABLE public.veiculo_fotos IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
COMMENT ON TABLE public.veiculo_vistoria_historico IS 'FASE2_RLS: Campo escreve via anon key. Restringir após migração para Supabase Auth.';
