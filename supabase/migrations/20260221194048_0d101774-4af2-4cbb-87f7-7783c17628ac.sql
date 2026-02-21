-- Fix orphan trip dc9013ad status and free driver ead4aae2
UPDATE viagens 
SET status = 'encerrado', h_fim_real = now(), encerrado = true
WHERE id = 'dc9013ad-c0cc-4ffa-a3aa-f6626bab30bb';

UPDATE motoristas 
SET status = 'disponivel' 
WHERE id = 'ead4aae2-3ebf-4fe0-ac5b-cf6b85265c8b';