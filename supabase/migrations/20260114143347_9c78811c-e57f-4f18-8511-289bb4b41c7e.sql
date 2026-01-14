-- Adiciona campo para configurar o horário de "virada" do dia operacional
-- Atividades após meia-noite e antes deste horário contam como dia anterior

ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS horario_virada_dia time DEFAULT '04:00:00';

COMMENT ON COLUMN eventos.horario_virada_dia IS 
'Horário que define a virada do dia operacional. Atividades após meia-noite e antes deste horário pertencem ao dia anterior. Exemplo: Se 04:00, uma viagem às 02:00 do dia 14/01 será registrada como dia 13/01.';