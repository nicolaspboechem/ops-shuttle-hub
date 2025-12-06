-- Limpar dados de teste anteriores
DELETE FROM public.viagens;
DELETE FROM public.eventos;

-- Inserir evento real: CCXP 6.12 (usando UUID gerado automaticamente)
INSERT INTO public.eventos (nome_planilha, status, total_viagens, data_criacao, data_ultima_sync)
VALUES ('CCXP 2024 - 06 de Dezembro', 'ativo', 0, NOW(), NOW());

-- Pegar o ID do evento recém criado para usar nas viagens
DO $$
DECLARE
  evento_uuid UUID;
BEGIN
  SELECT id INTO evento_uuid FROM public.eventos WHERE nome_planilha = 'CCXP 2024 - 06 de Dezembro' LIMIT 1;
  
  -- Inserir viagens TRANSFER (Aba 1 da planilha)
  INSERT INTO public.viagens (evento_id, tipo_operacao, motorista, tipo_veiculo, placa, coordenador, ponto_embarque, h_pickup, h_chegada, h_retorno, qtd_pax, qtd_pax_retorno, encerrado, observacao)
  VALUES 
    (evento_uuid, 'transfer', 'Jesse', 'Van', 'CUG6B86', 'Cassia', 'Rota Interior - Campinas e Jundiaí', '08:00', '11:44', NULL, 18, 0, false, NULL),
    (evento_uuid, 'transfer', 'Marcelo', 'Van', 'FLV1J86', 'Cassia', 'Rota Interior - Barueri e Osasco', '10:25', '11:30', NULL, 10, 0, false, NULL),
    (evento_uuid, 'transfer', 'Everton', 'Van', 'TJP2J88', 'Guimarães', 'Íbis Faria Lima', '11:00', '12:12', NULL, 7, 0, false, NULL),
    (evento_uuid, 'transfer', 'Lucas', 'Van', 'GCX0D11', 'Frazão', 'Tatuapé', '11:00', '12:08', NULL, 7, 0, false, NULL),
    (evento_uuid, 'transfer', 'Anderson', 'Ônibus', 'EWJ4G19', 'Juliana Harue', 'íbis CGH', '11:10', '12:13', NULL, 22, 0, false, NULL),
    (evento_uuid, 'transfer', 'André', 'Ônibus', 'EWJ4J52', 'Fagá', 'Meliá Paulista', '11:10', '12:15', NULL, 43, 0, false, 'Foi ajudar no Shuttle'),
    (evento_uuid, 'transfer', 'Mineiro', 'Van', 'SUW2C50', 'Fagá', 'Meliá Paulista', '11:10', '12:40', NULL, NULL, 0, false, NULL),
    (evento_uuid, 'transfer', 'Vilson', 'Van', 'CUDB0A44', 'Frazão', 'Guarulhos', '11:00', '12:46', NULL, 7, 0, false, 'Foi ajudar no Shuttle'),
    (evento_uuid, 'transfer', 'Rafael', 'Van', 'SWN2E95', 'Tati Suzarte', 'Íbis Morumbi', '11:20', '12:20', NULL, 14, 0, false, NULL),
    (evento_uuid, 'transfer', 'Eduardo', 'Ônibus', 'Myxd2f89', 'Rodrigo', 'Normandie e Ibis Centro', NULL, '12:52', NULL, NULL, 0, false, NULL),
    (evento_uuid, 'transfer', 'Marcelo', 'Van', 'QQL3192', 'Fagá', 'Meliá Paulista', '13:00', '13:42', NULL, 12, 0, false, NULL);

  -- Inserir viagens SHUTTLE (Aba 2 da planilha)
  INSERT INTO public.viagens (evento_id, tipo_operacao, motorista, tipo_veiculo, placa, coordenador, ponto_embarque, h_pickup, h_chegada, h_retorno, qtd_pax, qtd_pax_retorno, encerrado, observacao)
  VALUES 
    (evento_uuid, 'shuttle', 'João Paulo', 'Ônibus', 'QDI1B14', 'Ramos', NULL, '08:05', '08:35', '15:03', 46, 10, true, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', 'Ramos', NULL, '08:10', '08:40', '15:05', 46, 12, true, NULL),
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', 'Ramos', NULL, '08:26', '08:42', '15:05', 46, 15, true, NULL),
    (evento_uuid, 'shuttle', 'Heraldo', 'Ônibus', 'FBB1F01', 'Cotilha', NULL, '08:40', '08:55', '15:05', 46, 14, true, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'RBC7C96', 'Cotilha', NULL, '08:47', '09:05', '15:24', 15, NULL, true, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', 'Cotilha', NULL, '08:49', '09:10', NULL, 15, 25, false, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', 'Cotilha', NULL, '08:53', '09:14', '15:38', 15, 15, true, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', 'Eder', NULL, '09:00', '09:22', '15:37', 46, 12, true, NULL),
    (evento_uuid, 'shuttle', 'João Paulo', 'Ônibus', 'QDI1B14', 'Eder', NULL, '09:11', '09:33', '15:50', 46, 15, true, NULL),
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', 'Eder', NULL, '09:20', '09:41', '15:45', 46, 14, true, NULL),
    (evento_uuid, 'shuttle', 'Heraldo', 'Ônibus', 'FBB1F01', 'Cotilha', NULL, '09:26', '09:54', '15:45', 46, 14, true, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'RBC7C96', 'Eder', NULL, '09:31', '09:50', '16:04', 15, NULL, false, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', 'Cotilha', NULL, '09:34', '09:53', '16:07', 15, 15, true, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', 'Eder', NULL, '09:36', '09:59', '16:08', 15, 14, true, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', 'Cotilha', NULL, '09:45', '10:11', '16:15', 46, 15, true, NULL),
    (evento_uuid, 'shuttle', 'João Paulo', 'Ônibus', 'QDI1B14', 'Cotilha', NULL, '09:57', '10:25', '16:10', 46, 15, true, NULL),
    (evento_uuid, 'shuttle', 'Assis', 'Ônibus', 'EWJ4G10', 'Cotilha', NULL, '10:06', '10:38', '16:23', 46, 15, true, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'RBC7C96', 'Cotilha', NULL, '10:09', NULL, '16:30', 15, NULL, false, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', 'Cotilha', NULL, '10:11', '10:38', '16:25', 15, NULL, false, NULL),
    (evento_uuid, 'shuttle', 'Heraldo', 'Ônibus', 'FBB1F01', 'Cotilha', NULL, '10:13', '10:50', '16:27', 46, NULL, false, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', 'Cotilha', NULL, '10:21', '10:55', '11:00', 15, 2, true, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', 'Cotilha', NULL, '10:46', '11:21', '11:25', 46, 1, true, NULL),
    (evento_uuid, 'shuttle', 'Jadir', 'Ônibus', 'LLV3H36', 'Cotilha', NULL, '10:49', '11:25', '11:25', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'João Paulo', 'Ônibus', 'QDI1B14', 'Cotilha', NULL, '10:50', '11:21', '11:24', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Fernando', 'Ônibus', 'NT04G12', 'Eder', NULL, '10:54', NULL, NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Paulo', 'Ônibus', 'TJE7F59', 'Cotilha', NULL, '11:00', '11:37', '11:41', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Odilon', 'Ônibus', 'GAC0890', 'Cotilha', NULL, '11:00', '11:37', '11:41', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'RBC7C96', 'Cotilha', NULL, '11:05', '11:35', '11:36', 15, 1, true, NULL),
    (evento_uuid, 'shuttle', 'Paulo Henrique', 'Ônibus', 'GEU0F56', 'Cotilha', NULL, '11:06', '11:53', '11:55', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', 'Cotilha', NULL, '11:10', '11:35', '11:38', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Ciro', 'Van', 'TKR7D62', 'Cotilha', NULL, '11:11', '11:36', '11:39', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', 'Cotilha', NULL, '11:12', '11:42', '11:43', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Gustavo', 'Van', 'SUW5F04', 'Cotilha', NULL, '11:14', '11:50', '11:50', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Heraldo', 'Ônibus', 'FBB1F01', 'Cotilha', NULL, '11:22', '11:55', '11:57', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Ramon', 'Van', 'FAQ8221', 'Elivelton', NULL, '11:24', '11:53', '11:54', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Edson', 'Ônibus', 'FXM0A60', 'Elivelton', NULL, '11:28', '11:55', '11:58', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Lucas', 'Ônibus', 'OTU5I48', 'Elivelton', NULL, '11:34', '12:16', '12:17', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Celso', 'Van', 'DUG0B29', 'Elivelton', NULL, '11:37', '12:15', '12:19', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Renato', 'Van', 'GFK3B10', 'Elivelton', NULL, '11:38', '12:08', '12:10', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'João Paulo', 'Ônibus', 'QDI1B14', 'Elivelton', NULL, '11:50', '12:23', '12:25', 46, 2, true, NULL),
    (evento_uuid, 'shuttle', 'Jadir', 'Ônibus', 'LLV3H36', 'Cotilha', NULL, '11:55', '12:27', '12:29', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'RBC7C96', 'Cotilha', NULL, '11:56', '12:28', '12:29', 15, 1, true, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', 'Elivelton', NULL, '12:06', '12:41', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Bira', 'Van', 'GEB0B43', 'Elivelton', NULL, '12:09', '12:41', '12:43', 15, 2, true, NULL),
    (evento_uuid, 'shuttle', 'Ciro', 'Van', 'TKR7D62', 'Elivelton', NULL, '12:13', '12:41', '12:45', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Regis', 'Van', 'TLP7E69', 'Elivelton', NULL, '12:14', '12:46', '12:48', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Paulo', 'Ônibus', 'TJE7F59', 'Elivelton', NULL, '12:26', NULL, NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Odilon', 'Ônibus', 'GAC0890', 'Elivelton', NULL, '12:32', '13:14', '13:16', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Paulo Henrique', 'Ônibus', 'GEU0F56', 'Elivelton', NULL, '12:50', '13:22', '13:24', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Heraldo', 'Ônibus', 'FBB1F01', 'Elivelton', NULL, '13:01', '13:28', '13:31', 46, 2, true, NULL),
    (evento_uuid, 'shuttle', 'Edson', 'Ônibus', 'FXM0A60', 'Elivelton', NULL, '13:13', '13:41', '13:42', 46, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Gustavo', 'Van', 'SUW5F04', 'Eder', NULL, '13:14', '13:41', '13:42', 15, 0, true, NULL),
    (evento_uuid, 'shuttle', 'Leandro', 'Ônibus', 'FGB2C50', 'Eder', NULL, '13:39', '14:00', NULL, 44, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Ciro', 'Van', 'TKR7D62', 'Eder', NULL, '13:20', '13:39', '13:40', 15, 4, true, NULL),
    (evento_uuid, 'shuttle', 'Everton', 'Van', 'TJP2J88', 'Eder', NULL, '13:27', '13:45', '13:48', 15, 1, true, NULL),
    (evento_uuid, 'shuttle', 'Fernando', 'Ônibus', 'NT04G12', 'Cotilha', NULL, '13:52', NULL, NULL, NULL, 0, false, NULL),
    (evento_uuid, 'shuttle', 'João Paulo', 'Ônibus', 'QDI1B14', 'Eder', NULL, '14:12', '14:34', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Celso', 'Van', 'DUG0B29', 'Cotilha', NULL, '13:59', '14:23', '14:25', 15, 2, true, NULL),
    (evento_uuid, 'shuttle', 'Lucas', 'Ônibus', 'OTU5I48', 'Cotilha', NULL, '14:32', '14:56', NULL, 46, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Anderson', 'Ônibus', 'EWJ4G19', 'Cotilha', NULL, '15:00', '15:24', NULL, 40, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Odilon', 'Ônibus', 'GAC0890', 'Eder', NULL, '15:43', NULL, NULL, 40, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Luciano', 'Van', 'RBC7C96', 'Elivelton', NULL, '15:27', '15:37', NULL, 0, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Paulo', 'Ônibus', 'TJE7F59', 'Elivelton', NULL, '16:19', NULL, NULL, 29, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Marcelo', 'Van', 'QQL3192', NULL, NULL, '12:21', NULL, NULL, 0, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Anderson', 'Ônibus', 'EWJ4G19', NULL, NULL, '15:24', NULL, NULL, NULL, 0, false, NULL),
    (evento_uuid, 'shuttle', 'Ciro', 'Van', 'TKR7D62', NULL, NULL, '16:35', NULL, NULL, 14, 0, false, NULL);

  -- Atualizar contagem de viagens
  UPDATE public.eventos 
  SET total_viagens = (SELECT COUNT(*) FROM public.viagens WHERE evento_id = evento_uuid)
  WHERE id = evento_uuid;
  
END $$;