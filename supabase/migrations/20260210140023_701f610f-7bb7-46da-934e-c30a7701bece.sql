-- Corrigir viagem existente do Lorran: preencher campos legados a partir do veículo vinculado
UPDATE viagens 
SET 
  placa = 'SUL0H29',
  tipo_veiculo = 'SUV',
  qtd_pax = 1
WHERE id = 'fc8d2391-4792-4d87-a277-e47fff01e8f8';