

# Plano: Correção do Fuso Horário do App

## Problema Identificado

O relógio do Painel Localizador (e outras partes do app) está mostrando horário incorreto porque a função `get_server_time()` no banco de dados retorna o horário de forma ambígua.

### Causa Raiz

A função atual:
```sql
SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
```

**O que acontece:**
1. `NOW()` retorna `2026-02-03 16:39:39+00` (UTC)
2. `AT TIME ZONE 'America/Sao_Paulo'` converte para `2026-02-03 13:39:39` (SEM timezone!)
3. O JavaScript recebe `"2026-02-03 13:39:39"` e interpreta como UTC
4. O relógio exibe 3 horas à frente (ou com erro dependendo do navegador)

### Evidência
Consulta atual:
- `NOW()` = `16:39 UTC`
- `get_server_time()` = `13:39` (correto, mas sem indicador de timezone)
- JavaScript interpreta `13:39` como UTC → exibe errado

---

## Solução

### 1. Corrigir a função `get_server_time()` no Supabase

Alterar a função para retornar um timestamp que o JavaScript interprete corretamente:

```sql
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Retorna ISO 8601 com offset explícito de São Paulo
  SELECT to_char(
    NOW() AT TIME ZONE 'America/Sao_Paulo',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"-03:00"'
  );
$$;
```

**Por que TEXT?** Porque garante que o JavaScript receba exatamente a string `2026-02-03T13:39:39.123-03:00`, que ele parseia corretamente como horário de Brasília.

**Nota sobre horário de verão:** O Brasil atualmente não pratica horário de verão, então `-03:00` é fixo. Se o horário de verão for reinstituído no futuro, essa função precisaria ser ajustada.

### 2. Ajustar o hook `useServerTime.ts`

O hook precisa garantir que o parsing do timestamp retornado seja feito corretamente:

```typescript
// Parsing atual (problemático)
const serverDate = new Date(data); 

// Parsing corrigido (aceita a string ISO)
const serverDate = new Date(data);
// Com o novo formato, isso funcionará corretamente
```

O `new Date()` do JavaScript aceita strings ISO 8601 com offset, então a correção no banco é suficiente.

### 3. Corrigir usos de `toISOString()` para datas locais

Em alguns locais, o código usa `toISOString().split('T')[0]` para obter a data. Isso pode causar problemas de fuso. Locais identificados:

- `src/lib/utils/calcularProximasSaidas.ts` → usar `format(date, 'yyyy-MM-dd')`
- `src/hooks/useViagensPublicas.ts` → usar hora sincronizada

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/...` | Nova migration corrigindo `get_server_time()` |
| `src/integrations/supabase/types.ts` | Atualizar tipo de retorno |
| `src/lib/utils/calcularProximasSaidas.ts` | Usar `format()` em vez de `toISOString()` |
| `src/hooks/useViagensPublicas.ts` | Usar hora sincronizada via hook |

---

## Resumo Visual

```text
ANTES (Bugado):
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│  PostgreSQL  │ ───▶ │ "13:39:39"    │ ───▶ │  JavaScript  │
│  NOW() -3h   │      │ (sem timezone)│      │  = 13:39 UTC │
└──────────────┘      └───────────────┘      └──────────────┘
                                                    │
                                            Exibe: 10:39 BRT ❌

DEPOIS (Correto):
┌──────────────┐      ┌─────────────────────┐      ┌──────────────┐
│  PostgreSQL  │ ───▶ │ "13:39:39-03:00"    │ ───▶ │  JavaScript  │
│  NOW() -3h   │      │ (com offset)        │      │  = 13:39 BRT │
└──────────────┘      └─────────────────────┘      └──────────────┘
                                                          │
                                                  Exibe: 13:39 BRT ✅
```

---

## Instruções Manuais (Caso Queira Fazer Você Mesmo)

Se preferir corrigir manualmente no Supabase:

1. Vá para **Cloud View** → **Run SQL**
2. Execute:

```sql
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_char(
    NOW() AT TIME ZONE 'America/Sao_Paulo',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"-03:00"'
  );
$$;
```

3. Teste com: `SELECT get_server_time();`
   - Deve retornar algo como: `2026-02-03T13:39:39.123-03:00`

---

## Seção Técnica

### Detalhes da correção do PostgreSQL

A expressão `NOW() AT TIME ZONE 'America/Sao_Paulo'` retorna um `timestamp without time zone` porque você está extraindo a "hora local" daquele timezone. Quando isso é enviado via JSON para o frontend, o JavaScript não tem como saber que é horário de Brasília.

A solução usa `to_char()` para formatar a string com o offset `-03:00` explícito, que o `new Date()` do JavaScript interpreta corretamente.

### Locais com uso de `toISOString()` que precisam atenção

1. **`calcularProximasSaidas.ts`**: Usa `agora.toISOString().split('T')[0]` para pegar a data do dia. Se o usuário estiver em fuso diferente, isso pode dar a data errada. Solução: usar `format(agora, 'yyyy-MM-dd')`.

2. **`useViagensPublicas.ts`**: Cria `new Date()` local e converte para ISO. Deveria usar `getAgoraSync()` do hook de tempo sincronizado.

### Tipos TypeScript

O retorno da função muda de `string` (interpretado como timestamp) para `string` (ISO explícito), mas o tipo no TypeScript já é `string`, então não precisa de mudança no type.

