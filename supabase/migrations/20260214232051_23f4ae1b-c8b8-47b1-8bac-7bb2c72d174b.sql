-- Encerrar presença ativa de hoje do Evandro Mello
UPDATE motorista_presenca SET checkout_at = NOW(), observacao_checkout = 'Checkout manual CCO - correção de bug'
WHERE id = '9e9da108-9323-4d97-81e0-88b888f660ba' AND checkout_at IS NULL;

-- Encerrar registro órfão do dia 11/02
UPDATE motorista_presenca SET checkout_at = '2026-02-12T07:00:00Z', observacao_checkout = 'Checkout retroativo - registro órfão'
WHERE id = '52b159de-eba2-4c73-a5ac-9a96f1ac4d93' AND checkout_at IS NULL;

-- Atualizar status do motorista e desvincular veículo
UPDATE motoristas SET status = 'indisponivel', veiculo_id = NULL
WHERE id = 'f87526b3-7dcd-4aba-9658-ae437d586b33';

-- Desvincular veículo bidirecional
UPDATE veiculos SET motorista_id = NULL
WHERE motorista_id = 'f87526b3-7dcd-4aba-9658-ae437d586b33';