

# Correcao: Data de Termino do Evento Sobrescrita pelo Trigger

## Problema Identificado

O trigger `update_evento_stats` e disparado a cada INSERT/UPDATE/DELETE na tabela `viagens`. Ele recalcula `data_inicio` e `data_fim` do evento usando:

```sql
MIN(DATE(data_criacao))  -- data_inicio
MAX(DATE(data_criacao))  -- data_fim
```

Isso causa **dois problemas**:

1. **Sobrescrita**: Se voce configura `data_fim = 24/02` manualmente, o trigger sobrescreve para a data da ultima viagem criada (16/02), ignorando a configuracao manual.

2. **Fuso horario**: `DATE(data_criacao)` usa UTC (padrao do Supabase), nao Sao Paulo. Uma viagem criada as 23h de SP (02h UTC do dia seguinte) pode ser contada no dia errado.

## Solucao

Alterar o trigger para **nunca sobrescrever** `data_inicio` e `data_fim` -- esses campos passam a ser exclusivamente manuais, definidos pelo operador no modal de edicao do evento. O trigger continua atualizando apenas `total_viagens` e `data_ultima_sync`.

## Mudanca no Banco de Dados

Uma unica migracao SQL:

```sql
CREATE OR REPLACE FUNCTION public.update_evento_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento_id UUID;
  v_total INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_evento_id := OLD.evento_id;
  ELSE
    v_evento_id := NEW.evento_id;
  END IF;
  
  IF v_evento_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT COUNT(*)
  INTO v_total
  FROM viagens
  WHERE evento_id = v_evento_id;
  
  UPDATE eventos
  SET 
    total_viagens = COALESCE(v_total, 0),
    data_ultima_sync = NOW()
  WHERE id = v_evento_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

## Nenhuma mudanca no frontend

O modal `EditEventoModal` ja salva `data_inicio` e `data_fim` corretamente com `format(date, 'yyyy-MM-dd')` e faz o parse seguro com `T12:00:00`. A unica mudanca e no trigger do banco.

## Acao pos-migracao

Depois de aplicar a migracao, sera necessario atualizar o evento manualmente no modal de edicao, configurando `data_fim = 24/02/2026` (ou a data correta de termino).

## Resumo

| Item | Mudanca |
|------|---------|
| Trigger `update_evento_stats` | Remover calculo de `data_inicio`/`data_fim`, manter apenas `total_viagens` e `data_ultima_sync` |
| Frontend | Nenhuma alteracao |
| Dados | Atualizar `data_fim` do evento manualmente apos a migracao |

