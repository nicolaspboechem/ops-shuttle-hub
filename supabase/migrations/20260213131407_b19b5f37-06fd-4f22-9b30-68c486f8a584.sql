-- Correcao imediata: desvincular Rafael Santos do veiculo TKB0J35
UPDATE motoristas SET veiculo_id = NULL WHERE id = 'e091cbcf-d325-4aeb-8440-a52bf89b27d9';
UPDATE veiculos SET motorista_id = NULL WHERE id = 'f37a0f47-858f-4897-a3b6-8c628c6c1e03';