-- Passo 1: Corrigir horario de virada do evento para 3AM
UPDATE eventos 
SET horario_virada_dia = '03:00:00' 
WHERE id = '0c4756c6-0dd0-474b-89dc-e706825a8506';

-- Passo 2: Reverter os 13 auto-checkouts indevidos
UPDATE motorista_presenca 
SET checkout_at = NULL, observacao_checkout = NULL 
WHERE id IN (
  '09fd7671-34df-4690-8e78-d07812206a67',
  '1cf0ade6-ffa1-4888-b9ef-5f52b8951bcb',
  '6c75c271-dbe0-42a1-8af8-91755ef6d800',
  '10bc5442-5371-4605-b680-69973d3f5c6f',
  'cc4baca2-1349-4c6e-8dd4-86ee003ee2b6',
  '46cc35fa-febd-4b44-95b7-4a58525130ac',
  'ffe94285-4ad7-4d3b-983c-f310ebea8ae8',
  'c6b1f4ff-7208-4bdd-97d6-57a8519926a4',
  '93fb197a-f352-4af8-96c7-874fb932d072',
  'a5c6bbbf-ed3c-4ed6-976d-2d7d271eaeaa',
  'd294e2cd-00cb-4526-b684-ac227a94a21b',
  '915ea210-46a6-4104-8a12-d4e9955dbecf',
  '4d5158e9-e7fe-474b-895c-7ed6c2230902'
);

-- Passo 3: Restaurar status dos 12 motoristas para disponivel
UPDATE motoristas 
SET status = 'disponivel' 
WHERE id IN (
  'ebf8c6e9-b834-40e9-8cd0-c4ef9b34a80b',
  'f9d1a22b-420c-49e4-a410-f41e68338686',
  '519d9895-192d-44d0-8e35-d776f4afe1e0',
  '089cd32f-f1cb-471e-a08e-2749527bea59',
  'ead4aae2-3ebf-4fe0-ac5b-cf6b85265c8b',
  '7817fc2e-cc73-46b6-8c2d-66c23947fdf2',
  '44329104-c73b-45cc-8809-1aeb64e4a001',
  'f1a7c19b-2bcf-4714-9a37-feac0c318fc0',
  '5e6696ef-c456-4af2-90d2-431f1f1725f2',
  '6c519568-6005-4cc3-9613-eacf4c351369',
  '3743e157-e4ad-4392-8833-029e9b013bf9',
  '43a04d78-7890-4afc-af13-82e9b9849ba1'
);