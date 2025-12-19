-- Consolidate all viagens to the main CCXP event
UPDATE viagens SET evento_id = '29adc3dd-c9dc-4049-9f8c-5333bc5c14c7' 
WHERE evento_id IN (
  'f0dc2aee-840e-46c4-bf2f-09c8f059e17d',
  '631e09bf-b4d5-43dc-b8e1-e0ba4cfd68f2', 
  '2d3c82a9-b950-4f2a-94e2-6888b394e633',
  '74de5301-2704-4f30-8ad8-20f0ee89d402'
);

-- Update the main event with correct info
UPDATE eventos SET 
  nome_planilha = 'CCXP 2025',
  data_inicio = '2025-12-05',
  data_fim = '2025-12-07',
  status = 'ativo'
WHERE id = '29adc3dd-c9dc-4049-9f8c-5333bc5c14c7';

-- Delete duplicate events
DELETE FROM eventos WHERE id IN (
  'f0dc2aee-840e-46c4-bf2f-09c8f059e17d',
  '631e09bf-b4d5-43dc-b8e1-e0ba4cfd68f2', 
  '2d3c82a9-b950-4f2a-94e2-6888b394e633',
  '74de5301-2704-4f30-8ad8-20f0ee89d402'
);