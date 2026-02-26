-- Encerrar as 11 viagens ainda em_andamento do Rio Open 2026
UPDATE viagens 
SET status = 'encerrado', 
    encerrado = true, 
    observacao = COALESCE(observacao || ' | ', '') || 'Fechamento administrativo do evento',
    data_atualizacao = NOW()
WHERE evento_id = '0c4756c6-0dd0-474b-89dc-e706825a8506' 
  AND status = 'em_andamento'