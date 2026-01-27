-- 1. Encerrar viagem travada (motorista "Teste")
UPDATE viagens
SET status = 'encerrado',
    encerrado = true,
    h_chegada = '15:00:00',
    h_fim_real = NOW()
WHERE id = 'a3915e71-20f6-4dec-84f5-70f0235a03ac'
  AND status = 'em_andamento';

-- 2. Corrigir motorista "Teste" - atualizar localização para SDU
UPDATE motoristas
SET status = 'disponivel',
    ultima_localizacao = 'SDU',
    ultima_localizacao_at = NOW()
WHERE id = '96cee90d-5b1d-4179-8c5e-6f1d9c3fb9c8';

-- 3. Corrigir inconsistência de profile (Tatiana Suzarte)
UPDATE profiles
SET user_type = 'admin'
WHERE full_name = 'Tatiana Suzarte'
  AND user_type = 'motorista';

-- 4. Definir base para CCXP 2025 (Hilton Barra)
UPDATE pontos_embarque
SET eh_base = true
WHERE evento_id = '4a674005-5b4a-46c9-b010-12f867296602'
  AND nome = 'Hilton Barra';