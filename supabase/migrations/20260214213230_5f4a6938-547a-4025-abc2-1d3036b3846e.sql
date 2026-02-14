
-- 1. Encerrar viagem órfã da Cácia
UPDATE viagens SET status = 'encerrado', encerrado = true,
  h_fim_real = NOW(), observacao = COALESCE(observacao || ' | ', '') || 'Encerrado manualmente - viagem orfa'
WHERE id = 'a798c8b2-aed4-417a-8263-9c77add10b0c';

-- Resetar status da Cácia
UPDATE motoristas SET status = 'disponivel'
WHERE id = '65105abb-7e7a-463c-933a-13bae018c155';

-- 2. Encerrar viagens duplicadas do Luis Claudio
UPDATE viagens SET status = 'encerrado', encerrado = true,
  h_fim_real = NOW(), observacao = COALESCE(observacao || ' | ', '') || 'Encerrado manualmente - viagem duplicada'
WHERE id IN ('1e9bd87d-4729-41fb-8fc5-7df49c352f1e', 'e44bb3e1-8fe3-4c00-bc45-45a61f407806');

-- Resetar status do Luis Claudio
UPDATE motoristas SET status = 'disponivel'
WHERE id = '249f1852-2843-4d6a-b014-8e15124da14a';

-- 3. Resetar status do Alexandre Lima
UPDATE motoristas SET status = 'disponivel'
WHERE id = '519d9895-192d-44d0-8e35-d776f4afe1e0';
