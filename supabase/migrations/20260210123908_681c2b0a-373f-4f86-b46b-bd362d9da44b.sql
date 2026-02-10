-- motoristas: desvincular veiculo ao excluir
ALTER TABLE public.motoristas
  DROP CONSTRAINT motoristas_veiculo_id_fkey,
  ADD CONSTRAINT motoristas_veiculo_id_fkey
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL;

-- viagens: manter historico, limpar referencia
ALTER TABLE public.viagens
  DROP CONSTRAINT viagens_veiculo_id_fkey,
  ADD CONSTRAINT viagens_veiculo_id_fkey
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL;

-- motorista_presenca: manter historico, limpar referencia
ALTER TABLE public.motorista_presenca
  DROP CONSTRAINT motorista_presenca_veiculo_id_fkey,
  ADD CONSTRAINT motorista_presenca_veiculo_id_fkey
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL;