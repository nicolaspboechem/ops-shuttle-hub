-- Popular veiculo_vistoria_historico com dados existentes de veiculos que têm inspecao_dados
-- Isso garante que o histórico fique completo retroativamente

INSERT INTO veiculo_vistoria_historico (
  veiculo_id,
  evento_id,
  tipo_vistoria,
  status_anterior,
  status_novo,
  possui_avarias,
  inspecao_dados,
  nivel_combustivel,
  km_registrado,
  realizado_por,
  created_at
)
SELECT 
  v.id as veiculo_id,
  v.evento_id,
  'inspecao' as tipo_vistoria,
  NULL as status_anterior,
  COALESCE(v.status, 'em_inspecao') as status_novo,
  COALESCE(v.possui_avarias, false),
  v.inspecao_dados,
  v.nivel_combustivel,
  v.km_inicial as km_registrado,
  v.inspecao_por as realizado_por,
  COALESCE(v.inspecao_data, v.data_criacao) as created_at
FROM veiculos v
WHERE v.inspecao_dados IS NOT NULL
  AND v.evento_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM veiculo_vistoria_historico vh 
    WHERE vh.veiculo_id = v.id
  );