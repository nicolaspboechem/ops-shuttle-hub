-- Encerrar 2 viagens duplicadas do Claudio Gomes (manter a primeira)
UPDATE viagens SET status = 'encerrado', encerrado = true,
  h_fim_real = NOW(),
  observacao = COALESCE(observacao || ' | ', '') || 'Encerrado - duplicata corrigida'
WHERE id IN (
  '156c07e9-5c03-45f1-99d1-ea24ced0d67d',
  '75a09966-1499-4bde-8a5d-18d201d0033a'
);