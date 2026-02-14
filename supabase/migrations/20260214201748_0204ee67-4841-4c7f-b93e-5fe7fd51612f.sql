UPDATE viagens
SET status = 'encerrado', encerrado = true, h_fim_real = now(),
    observacao = COALESCE(observacao || ' | ', '') || 'Encerrada automaticamente - dia anterior'
WHERE encerrado = false
  AND status IN ('agendado', 'em_andamento')
  AND data_criacao::date < CURRENT_DATE;