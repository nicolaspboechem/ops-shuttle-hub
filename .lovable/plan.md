
# Plano: Corrigir Erro de Check-out - Trigger com Campo Incorreto

## Problema Identificado

O erro 400 no check-out ocorre porque o trigger `update_motorista_presenca_updated_at` na tabela `motorista_presenca` chama a função `update_updated_at_column`, que tenta atualizar o campo `data_atualizacao`:

```sql
NEW.data_atualizacao = NOW();
```

Porém, a tabela `motorista_presenca` tem o campo chamado `updated_at`, não `data_atualizacao`.

**Resultado**: Toda operação de UPDATE na tabela falha com o erro:
> `record "new" has no field "data_atualizacao"`

---

## Evidências dos Logs

```text
error_severity: ERROR
event_message: record "new" has no field "data_atualizacao"
timestamp: 2026-02-04
```

Este erro aparece múltiplas vezes nos logs do Postgres, confirmando que é a causa do problema de check-out.

---

## Solução

Corrigir a função `update_updated_at_column` para usar o nome de coluna correto (`updated_at`), ou criar uma função específica para tabelas que usam `updated_at`.

---

## Seção Técnica

### Opção 1 - Modificar a função existente (recomendado)

Atualizar a função `update_updated_at_column` para usar `updated_at`:

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
```

**Risco**: Se outras tabelas usam essa função e têm campo `data_atualizacao`, elas quebrarão.

### Opção 2 - Verificar quais tabelas usam essa função

Antes de modificar, verificar quais tabelas dependem dessa função para garantir que não quebramos nada.

### Verificação prévia necessária

Listar todas as tabelas que usam o trigger com essa função:

```sql
SELECT tgrelid::regclass as tabela
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname = 'update_updated_at_column';
```

---

## Ação Recomendada

1. **Migração SQL** para corrigir a função:
   - Verificar tabelas dependentes
   - Se apenas `motorista_presenca` usa, atualizar a função
   - Se várias tabelas usam com nomes diferentes, criar função específica ou usar função dinâmica

2. **Migração de segurança**:

```sql
-- Corrigir a função para usar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
```

---

## Resultado Esperado

1. Check-out funciona sem erro 400
2. O campo `updated_at` é atualizado automaticamente em operações de UPDATE
3. Trigger opera corretamente
