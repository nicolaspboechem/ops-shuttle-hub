-- Fix Edenilson's first record: add checkout (same time as checkin - driver's mistake)
UPDATE public.motorista_presenca 
SET checkout_at = '2026-02-12T14:06:37.99+00:00', 
    observacao_checkout = 'Check-out manual - motorista fez check-in e check-out imediato por engano'
WHERE id = '94fe5e80-a271-42fe-a9a8-196003cd0c2d';

-- Create new record for the second shift (check-in ~17:18 BRT = 20:18 UTC)
INSERT INTO public.motorista_presenca (motorista_id, evento_id, data, checkin_at, veiculo_id)
VALUES (
  '8447b761-35da-4616-b11d-642e56ddd113',
  '0c4756c6-0dd0-474b-89dc-e706825a8506',
  '2026-02-12',
  '2026-02-12T20:18:00.000+00:00',
  NULL
);