-- Corrigir viagens que estão 'aguardando_retorno' mas encerrado = true (inconsistência)
UPDATE viagens 
SET status = 'encerrado' 
WHERE status = 'aguardando_retorno' AND encerrado = true;