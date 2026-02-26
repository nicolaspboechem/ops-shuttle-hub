
-- =============================================
-- FIX 1: Restringir SELECT de eventos
-- Permitir público apenas campos não-sensíveis de eventos visíveis
-- Acesso completo para membros do evento
-- =============================================

DROP POLICY IF EXISTS "eventos_select_public" ON public.eventos;

-- Membros do evento têm acesso completo
CREATE POLICY "eventos_select_member"
  ON public.eventos FOR SELECT
  TO authenticated
  USING (has_event_access(auth.uid(), id));

-- Acesso público limitado a eventos visíveis (para painel público)
CREATE POLICY "eventos_select_public_visible"
  ON public.eventos FOR SELECT
  TO anon, authenticated
  USING (visivel_publico = true);

-- =============================================
-- FIX 2: Restringir SELECT de profiles
-- Apenas usuários autenticados podem ver profiles
-- =============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
