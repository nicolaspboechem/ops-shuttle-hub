
-- Deletar duplicatas do Fabricio (manter 1 dos 3 registros identicos de 16:53:29)
DELETE FROM motorista_presenca 
WHERE id IN ('ee7aba65-32c7-47f9-879a-229d23f8e89b', '0324bcec-66d8-4c83-8f1c-e0b8d3acc846');

-- Deletar duplicata do Alexandre Lima (manter 9e2e9621)
DELETE FROM motorista_presenca 
WHERE id = '254f7c18-2d0b-4cfd-a4b9-1f5262b69313';

-- Fechar presenças orfas de dia 19 -> virada = 2026-02-20 04:50:00 BRT = 2026-02-20 07:50:00 UTC
UPDATE motorista_presenca SET checkout_at = '2026-02-20 07:50:00+00', 
  observacao_checkout = 'Checkout automático (virada operacional)'
WHERE id IN ('465e442f-fa21-4615-8ad3-8ac2abe50906', '627c532f-5c35-4c64-9ef5-bb74bb715e8e', 'ae652437-4dab-474e-afec-a82fff425e8f');

-- Fechar presenças orfas de dia 20 -> virada = 2026-02-21 04:50:00 BRT = 2026-02-21 07:50:00 UTC
UPDATE motorista_presenca SET checkout_at = '2026-02-21 07:50:00+00',
  observacao_checkout = 'Checkout automático (virada operacional)'
WHERE id IN ('050e4f09-970e-42eb-b8be-99fcae400a5e', 'bca839ef-0876-4e90-98c4-6bfa35d6cf98');
