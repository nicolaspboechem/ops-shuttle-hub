ALTER TABLE eventos
  ADD COLUMN horario_inicio_evento time DEFAULT '08:00:00',
  ADD COLUMN horario_fim_evento time DEFAULT '23:00:00';