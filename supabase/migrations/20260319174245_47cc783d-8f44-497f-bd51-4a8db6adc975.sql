
-- Table to persist notification state per user
CREATE TABLE public.notificacao_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_key text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  ocultada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_key)
);

-- Index for fast lookups
CREATE INDEX idx_notificacao_usuario_user ON public.notificacao_usuario(user_id);
CREATE INDEX idx_notificacao_usuario_lookup ON public.notificacao_usuario(user_id, ocultada);

-- RLS
ALTER TABLE public.notificacao_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON public.notificacao_usuario
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_notificacao_usuario_updated_at
  BEFORE UPDATE ON public.notificacao_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
