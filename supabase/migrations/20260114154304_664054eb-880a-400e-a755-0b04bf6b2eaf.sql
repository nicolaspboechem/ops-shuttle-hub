-- Adicionar campos para controle de painéis e configurações de alertas
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS habilitar_localizador BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alerta_limiar_amarelo INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS alerta_limiar_vermelho INTEGER DEFAULT 25;