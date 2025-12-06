-- Inserir evento de teste
INSERT INTO public.eventos (id, nome_planilha, status, total_viagens, data_criacao, data_ultima_sync)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Evento Corporativo ABC - Dezembro 2024', 'ativo', 12, NOW(), NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Congresso Nacional XYZ', 'ativo', 8, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour');

-- Inserir viagens de teste para o primeiro evento
INSERT INTO public.viagens (evento_id, tipo_operacao, motorista, tipo_veiculo, placa, coordenador, ponto_embarque, h_pickup, h_chegada, h_retorno, qtd_pax, qtd_pax_retorno, encerrado, observacao)
VALUES 
  -- Viagens ativas (sem retorno)
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'João Silva', 'Ônibus', 'ABC-1234', 'Maria Santos', 'Aeroporto GRU - Terminal 2', '08:00', '08:45', NULL, 42, 0, false, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'Carlos Oliveira', 'Van', 'DEF-5678', 'Maria Santos', 'Hotel Marriott', '08:30', NULL, NULL, 15, 0, false, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'shuttle', 'Pedro Costa', 'Ônibus', 'GHI-9012', 'João Ferreira', NULL, '09:00', '09:30', NULL, 38, 0, false, 'Rota circular centro'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'Ana Rodrigues', 'Van', 'JKL-3456', 'Maria Santos', 'Centro de Convenções', '09:15', NULL, NULL, 12, 0, false, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'shuttle', 'Roberto Lima', 'Ônibus', 'MNO-7890', 'João Ferreira', NULL, '09:30', NULL, NULL, 45, 0, false, NULL),
  
  -- Viagens finalizadas
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'João Silva', 'Ônibus', 'ABC-1234', 'Maria Santos', 'Aeroporto GRU - Terminal 1', '06:00', '06:40', '07:15', 40, 38, true, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'Carlos Oliveira', 'Van', 'DEF-5678', 'Maria Santos', 'Hotel Hilton', '06:30', '07:00', '07:30', 14, 14, true, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'shuttle', 'Pedro Costa', 'Ônibus', 'GHI-9012', 'João Ferreira', NULL, '07:00', '07:25', '07:50', 35, 32, true, 'Rota expressa'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'Ana Rodrigues', 'Van', 'JKL-3456', 'Maria Santos', 'Estação Rodoviária', '07:15', '07:45', '08:10', 10, 10, true, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'shuttle', 'Roberto Lima', 'Ônibus', 'MNO-7890', 'João Ferreira', NULL, '07:30', '08:00', '08:25', 42, 40, true, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'Marcos Souza', 'Van', 'PQR-1234', 'Maria Santos', 'Shopping Center Norte', '07:45', '08:15', '08:40', 8, 8, true, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'Fernanda Alves', 'Ônibus', 'STU-5678', 'João Ferreira', 'Parque Ibirapuera', '08:00', '08:35', '09:00', 50, 48, true, 'Grupo grande');

-- Inserir viagens para o segundo evento
INSERT INTO public.viagens (evento_id, tipo_operacao, motorista, tipo_veiculo, placa, coordenador, ponto_embarque, h_pickup, h_chegada, h_retorno, qtd_pax, qtd_pax_retorno, encerrado, observacao)
VALUES 
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'transfer', 'Lucas Mendes', 'Ônibus', 'VWX-9012', 'Ana Paula', 'Aeroporto Congonhas', '10:00', '10:30', NULL, 35, 0, false, NULL),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'shuttle', 'Juliana Santos', 'Van', 'YZA-3456', 'Ana Paula', NULL, '10:15', NULL, NULL, 18, 0, false, 'Rota hotel-evento'),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'transfer', 'Ricardo Gomes', 'Ônibus', 'BCD-7890', 'Carlos Eduardo', 'Terminal Tietê', '10:30', NULL, NULL, 40, 0, false, NULL),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'transfer', 'Lucas Mendes', 'Ônibus', 'VWX-9012', 'Ana Paula', 'Hotel Fasano', '08:00', '08:25', '08:50', 30, 28, true, NULL),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'shuttle', 'Juliana Santos', 'Van', 'YZA-3456', 'Ana Paula', NULL, '08:30', '08:55', '09:20', 16, 16, true, NULL),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'transfer', 'Ricardo Gomes', 'Ônibus', 'BCD-7890', 'Carlos Eduardo', 'Centro Empresarial', '09:00', '09:30', '09:55', 38, 36, true, NULL),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'shuttle', 'Patricia Lima', 'Van', 'EFG-1234', 'Carlos Eduardo', NULL, '09:15', '09:40', '10:05', 12, 12, true, 'Executivos VIP'),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'transfer', 'Patricia Lima', 'Van', 'EFG-1234', 'Carlos Eduardo', 'Aeroporto Congonhas', '09:30', '09:55', '10:20', 14, 14, true, NULL);

-- Atualizar total_viagens dos eventos
UPDATE public.eventos SET total_viagens = 12 WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
UPDATE public.eventos SET total_viagens = 8 WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';