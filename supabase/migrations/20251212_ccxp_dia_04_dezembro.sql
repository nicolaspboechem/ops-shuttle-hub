-- Inserir evento: CCXP 4.12 (04 de Dezembro)
INSERT INTO public.eventos (nome_planilha, status, total_viagens, data_criacao, data_ultima_sync)
VALUES ('CCXP 2024 - 04 de Dezembro', 'ativo', 0, NOW(), NOW());

-- Pegar o ID do evento recém criado para usar nas viagens
DO $$
DECLARE
  evento_uuid UUID;
BEGIN
  SELECT id INTO evento_uuid FROM public.eventos WHERE nome_planilha = 'CCXP 2024 - 04 de Dezembro' LIMIT 1;
  
  -- Inserir viagens SHUTTLE (dados da planilha do dia 4)
  -- Agrupando horários por motorista/veículo em viagens lógicas
  
  INSERT INTO public.viagens (evento_id, tipo_operacao, motorista, tipo_veiculo, placa, coordenador, ponto_embarque, h_pickup, h_chegada, h_retorno, qtd_pax, qtd_pax_retorno, encerrado, observacao)
  VALUES 
    -- BIRA - VAN GEB0B43
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', NULL, NULL, '08:00', '08:50', '18:22', 15, 0, true, 'KM Inicial: 95143'),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', NULL, NULL, '09:58', '10:41', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', NULL, NULL, '11:40', '12:20', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', NULL, NULL, '15:31', '16:43', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', NULL, NULL, '19:15', '20:35', NULL, 15, 0, false, NULL),
    
    -- LEANDRO - BUS FGB2C50
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', NULL, NULL, '08:08', '09:10', '17:48', 46, 0, true, 'KM Inicial: 482391'),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', NULL, NULL, '09:50', '10:30', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', NULL, NULL, '11:30', '12:15', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', NULL, NULL, '13:05', '17:15', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', NULL, NULL, '18:54', '20:49', NULL, 46, 0, false, NULL),
    
    -- RAMON - VAN FAQ8221
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', NULL, NULL, '08:02', '08:52', '19:04', 15, 0, true, 'KM Inicial: 367849'),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', NULL, NULL, '09:26', '10:12', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', NULL, NULL, '11:00', '11:53', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', NULL, NULL, '13:01', '14:47', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', NULL, NULL, '17:23', NULL, NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', NULL, NULL, '20:10', '21:33', NULL, 15, 0, false, NULL),
    
    -- ASSIS - BUS EWJ4G10
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', NULL, NULL, '11:12', '12:25', '18:30', 46, 0, true, 'KM Inicial: 19715.6'),
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', NULL, NULL, '13:10', '14:01', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', NULL, NULL, '15:08', NULL, NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', NULL, NULL, '19:24', '20:29', NULL, 46, 0, false, NULL),
    
    -- LUCIANO - VAN GFK3B10
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'GFK3B10', NULL, NULL, '08:05', '09:25', '17:40', 15, 0, true, 'KM Inicial: 195930'),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'GFK3B10', NULL, NULL, '10:54', '11:40', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'GFK3B10', NULL, NULL, '12:31', '13:14', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'GFK3B10', NULL, NULL, '16:01', '17:11', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'GFK3B10', NULL, NULL, '18:36', '19:31', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'GFK3B10', NULL, NULL, '20:35', NULL, NULL, 15, 0, false, NULL),
    
    -- LUAN - BUS NTO4G12
    (evento_uuid, 'shuttle', 'Luan', 'Ônibus', 'NTO4G12', NULL, NULL, '11:30', '12:27', '18:08', 46, 0, true, 'KM Inicial: 807637'),
    (evento_uuid, 'shuttle', 'Luan', 'Ônibus', 'NTO4G12', NULL, NULL, '13:11', '14:09', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luan', 'Ônibus', 'NTO4G12', NULL, NULL, '15:16', '17:25', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luan', 'Ônibus', 'NTO4G12', NULL, NULL, '19:02', '20:32', NULL, 46, 0, false, NULL),
    
    -- CELIO - VAN FRO8G78
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '11:20', '12:00', NULL, 15, 0, false, 'KM Inicial: 326721'),
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '12:50', '13:30', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '14:10', '14:50', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '15:30', '16:10', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '16:50', '17:30', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '18:10', '18:50', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Celio', 'Van', 'FRO8G78', NULL, NULL, '19:30', '20:15', NULL, 15, 0, false, NULL),
    
    -- ANDRÉ - BUS (sem placa na planilha)
    (evento_uuid, 'shuttle', 'André', 'Ônibus', NULL, NULL, NULL, '12:36', '13:43', NULL, 46, 0, false, 'KM Inicial: 903946'),
    (evento_uuid, 'shuttle', 'André', 'Ônibus', NULL, NULL, NULL, '15:45', '17:15', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'André', 'Ônibus', NULL, NULL, NULL, '18:00', '19:00', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'André', 'Ônibus', NULL, NULL, NULL, '20:00', '21:00', NULL, 46, 0, false, NULL),
    
    -- REGIS - VAN TLP7E69
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', NULL, NULL, '11:14', '12:10', '17:25', 15, 0, true, 'KM Inicial: 9736'),
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', NULL, NULL, '13:02', '13:44', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', NULL, NULL, '16:57', NULL, NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', NULL, NULL, '18:23', '19:14', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', NULL, NULL, '20:08', '21:06', NULL, 15, 0, false, NULL),
    
    -- DANIEL - VAN (sem placa na planilha)
    (evento_uuid, 'shuttle', 'Daniel', 'Van', NULL, NULL, NULL, '13:50', '14:35', '20:18', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Daniel', 'Van', NULL, NULL, NULL, '16:15', '17:15', NULL, 15, 0, false, NULL),
    
    -- EVERTON - VAN (sem placa na planilha)
    (evento_uuid, 'shuttle', 'Everton', 'Van', NULL, NULL, NULL, '13:36', '14:24', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Everton', 'Van', NULL, NULL, NULL, '15:05', '16:29', NULL, 15, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Everton', 'Van', NULL, NULL, NULL, '19:55', NULL, NULL, 15, 0, false, NULL);

  -- Atualizar contagem de viagens
  UPDATE public.eventos 
  SET total_viagens = (SELECT COUNT(*) FROM public.viagens WHERE evento_id = evento_uuid)
  WHERE id = evento_uuid;
  
END $$;
