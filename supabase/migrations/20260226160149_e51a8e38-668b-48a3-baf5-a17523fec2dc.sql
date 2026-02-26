
-- Step 1: Nullify FK references in veiculo_vistoria_historico
UPDATE veiculo_vistoria_historico SET realizado_por = NULL
WHERE realizado_por IN (
  '2bf77817-1d9b-4e52-963a-0fccd4f0582a',
  '551c8825-4124-4e94-912c-398944a799eb',
  'ab19f36d-2447-4dd3-bc12-051596a43e4e'
);

-- Step 2: Nullify FK references in veiculos
UPDATE veiculos SET atualizado_por = NULL
WHERE atualizado_por IN (
  '2bf77817-1d9b-4e52-963a-0fccd4f0582a',
  'ab19f36d-2447-4dd3-bc12-051596a43e4e'
);

UPDATE veiculos SET inspecao_por = NULL
WHERE inspecao_por IN (
  '2bf77817-1d9b-4e52-963a-0fccd4f0582a',
  'ab19f36d-2447-4dd3-bc12-051596a43e4e'
);

UPDATE veiculos SET liberado_por = NULL
WHERE liberado_por IN (
  'ab19f36d-2447-4dd3-bc12-051596a43e4e'
);

-- Step 3: Delete orphan evento_usuarios
DELETE FROM evento_usuarios 
WHERE user_id IN (
  'ba2fad6e-1cfc-4d39-a210-aaf4146334c5',
  'ab19f36d-2447-4dd3-bc12-051596a43e4e',
  'c5bd8d01-631c-4ccb-b683-7537ea22e66b',
  '8ba25828-8916-44e5-bf80-d249c842b26d',
  '62162a57-147f-4966-9d8f-b9d919c527da',
  '551c8825-4124-4e94-912c-398944a799eb'
);

-- Step 4: Delete orphan profiles
DELETE FROM profiles 
WHERE user_id IN (
  '2bf77817-1d9b-4e52-963a-0fccd4f0582a',
  '5909cfe2-0134-4cdc-9679-f194cf4f0aac',
  'c3e2c2c3-0526-48dd-9a23-09e5655b8dc4',
  '62162a57-147f-4966-9d8f-b9d919c527da',
  'ba2fad6e-1cfc-4d39-a210-aaf4146334c5',
  '551c8825-4124-4e94-912c-398944a799eb',
  '27477205-817e-47ad-ae3d-fbd88c7534ea',
  'ab19f36d-2447-4dd3-bc12-051596a43e4e',
  'c5bd8d01-631c-4ccb-b683-7537ea22e66b',
  '8ba25828-8916-44e5-bf80-d249c842b26d'
);
