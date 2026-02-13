

# Otimizacao Fase 3 - Queries sequenciais e Realtime sem filtro

## Diagnostico

Apos as otimizacoes v1.7.4 e v1.7.5, restam problemas significativos:

### 1. useMotoristaPresenca - 5 queries sequenciais por motorista

Cada motorista conectado executa a funcao `fetchPresenca` que faz **5 queries em serie** (cada uma espera a anterior terminar):

```text
Query 1: SELECT eventos (horario_virada)
Query 2: SELECT motorista_presenca (presencas ativas)
Query 3: SELECT motoristas (veiculo_id)
Query 4: SELECT veiculos (dados do veiculo)
Query 5: SELECT motorista_presenca (fallback se nao achou ativa)
Query 6: SELECT veiculos (veiculo da presenca - condicional)
```

Em 4G com latencia de ~200ms, isso significa **1-1.2 segundos** so para carregar a presenca. Com polling a cada 60s, sao 5 queries x 41 motoristas = **205 queries/minuto** so de presenca.

Alem disso, tem `console.log` em cada callback Realtime, gerando lixo no console.

### 2. useAlertasFrota - Realtime SEM filtro de evento_id

Linha 92: escuta TODAS as mudancas em `alertas_frota` sem filtro. Cada alerta criado em qualquer evento dispara refetch no supervisor.

### 3. useMissoes (global) - Carrega missoes concluidas/canceladas

O hook global usado pelo Operador/Supervisor carrega TODAS as missoes incluindo concluidas e canceladas. Em eventos grandes, isso pode ser centenas de registros desnecessarios.

### 4. useLocalizadorMotoristas - 4 queries sequenciais

Faz 4 queries separadas (evento, presencas, motoristas, veiculos, viagens) quando poderia usar JOINs.

### 5. SupervisorFrotaTab - veiculos sem Realtime

Os veiculos sao carregados uma unica vez no mount, sem Realtime. Mudancas de status nao aparecem automaticamente.

## Solucao

### 1. Criar RPC no Supabase para presenca do motorista

Uma unica funcao que retorna presenca + veiculo + config do evento em uma chamada:

```sql
CREATE OR REPLACE FUNCTION get_motorista_presenca(
  p_evento_id UUID,
  p_motorista_id UUID,
  p_data DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'habilitar_missoes', e.habilitar_missoes,
    'horario_virada_dia', e.horario_virada_dia,
    'veiculo_id', m.veiculo_id,
    'veiculo', CASE WHEN m.veiculo_id IS NOT NULL THEN (
      SELECT row_to_json(v) FROM veiculos v WHERE v.id = m.veiculo_id
    ) ELSE NULL END,
    'presenca_ativa', (
      SELECT row_to_json(mp) FROM motorista_presenca mp
      WHERE mp.motorista_id = p_motorista_id
        AND mp.evento_id = p_evento_id
        AND mp.data = p_data
        AND mp.checkin_at IS NOT NULL
        AND mp.checkout_at IS NULL
      ORDER BY mp.created_at DESC LIMIT 1
    ),
    'presenca_recente', (
      SELECT row_to_json(mp) FROM motorista_presenca mp
      WHERE mp.motorista_id = p_motorista_id
        AND mp.evento_id = p_evento_id
        AND mp.data = p_data
      ORDER BY mp.created_at DESC LIMIT 1
    )
  ) INTO result
  FROM eventos e
  CROSS JOIN motoristas m
  WHERE e.id = p_evento_id
    AND m.id = p_motorista_id;
  
  RETURN result;
END;
$$;
```

Isso reduz de **5-6 queries** para **1 chamada RPC**.

### 2. useMotoristaPresenca - Usar RPC e limpar console.logs

- Substituir as 5 queries sequenciais por uma chamada `supabase.rpc('get_motorista_presenca', {...})`
- Remover todos os `console.log` dos callbacks Realtime
- Manter Realtime apenas para invalidar/refetch (ja esta filtrado por motorista_id)

### 3. useAlertasFrota - Adicionar filtro evento_id no Realtime

```typescript
// ANTES (sem filtro):
.on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_frota' }, ...)

// DEPOIS (com filtro):
.on('postgres_changes', { 
  event: '*', schema: 'public', table: 'alertas_frota',
  filter: `evento_id=eq.${eventoId}`
}, ...)
```

### 4. useMissoes (global) - Filtrar apenas missoes ativas

Adicionar `.in('status', ['pendente', 'aceita', 'em_andamento'])` na query do hook global para nao carregar missoes concluidas/canceladas que nao sao exibidas no painel.

### 5. useLocalizadorMotoristas - Combinar queries com JOINs

Substituir 4 queries sequenciais por uma query unica com JOINs:

```typescript
// ANTES: 4 queries separadas (evento, presencas, motoristas, veiculos)
// DEPOIS: 1 query com JOINs
const { data } = await supabase
  .from('motoristas')
  .select('*, veiculo:veiculos!motoristas_veiculo_id_fkey(*)')
  .eq('evento_id', eventoId);
```

E buscar presencas e viagens ativas em paralelo com `Promise.all`.

### 6. Versao

Atualizar `APP_VERSION` para `1.7.6`.

## Resumo de mudancas

| Arquivo | Mudanca | Impacto |
|---|---|---|
| Migration SQL | Criar RPC `get_motorista_presenca` | Reduz 5 queries para 1 por motorista |
| `src/hooks/useMotoristaPresenca.ts` | Usar RPC, remover console.logs | -80% queries de presenca |
| `src/hooks/useAlertasFrota.ts` | Adicionar filtro evento_id no Realtime | Elimina cross-talk entre eventos |
| `src/hooks/useMissoes.ts` | Filtrar apenas missoes ativas no hook global | -50% dados transferidos |
| `src/hooks/useLocalizadorMotoristas.ts` | Usar JOINs + Promise.all em vez de queries sequenciais | -60% round-trips |
| `src/lib/version.ts` | Atualizar para 1.7.6 | - |

## Resultado esperado

- Presenca do motorista carrega em **1 round-trip** em vez de 5 (200ms vs 1s em 4G)
- Alertas Realtime filtrados por evento
- Missoes carregam apenas dados ativos (payload ~50% menor)
- Localizador faz queries em paralelo em vez de sequencial
- Reducao total estimada: **~60% menos queries/minuto** comparado com v1.7.5

