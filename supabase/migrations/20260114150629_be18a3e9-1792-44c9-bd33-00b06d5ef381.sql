-- Renomear campo para clareza conceitual
-- habilitar_checkin passa a ser habilitar_missoes
-- Isso vincula explicitamente o check-in/vistoria ao módulo de Missões

ALTER TABLE eventos 
RENAME COLUMN habilitar_checkin TO habilitar_missoes;

COMMENT ON COLUMN eventos.habilitar_missoes IS 
'Quando ativo, habilita o módulo de Missões: check-in/vistoria obrigatória para motoristas, designação de tarefas pelo CCO, e exibição no Painel Localizador';