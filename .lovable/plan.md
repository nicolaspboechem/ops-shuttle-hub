

# Correcao de Dados Inconsistentes e Protecao Anti-Duplicata

## Parte 1: Correcao de dados (SQL direto)

Tres motoristas com dados inconsistentes serao corrigidos:

### 1. Cacia Lima "Hellen"
- **Problema**: Viagem `a798c8b2` em `em_andamento` / `encerrado = false` (missao foi concluida via CCO antes do fix de sync)
- **Correcao**: Encerrar a viagem e resetar status da motorista para `disponivel`

### 2. Luis Claudio
- **Problema**: Duas viagens duplicadas criadas com 1 segundo de diferenca (double-click), ambas `em_andamento`
  - `1e9bd87d` (16:53:55)
  - `e44bb3e1` (16:53:57)
- **Correcao**: Encerrar ambas as viagens e resetar status do motorista para `disponivel`

### 3. Alexandre Lima
- **Problema**: Status `em_viagem` sem nenhuma viagem ativa (orfao puro)
- **Correcao**: Resetar status para `disponivel`

### Comandos SQL

```sql
-- 1. Encerrar viagem orfa da Cacia
UPDATE viagens SET status = 'encerrado', encerrado = true,
  h_fim_real = NOW(), observacao = COALESCE(observacao || ' | ', '') || 'Encerrado manualmente - viagem orfa'
WHERE id = 'a798c8b2-aed4-417a-8263-9c77add10b0c';

-- Resetar status da Cacia
UPDATE motoristas SET status = 'disponivel'
WHERE id = '65105abb-7e7a-463c-933a-13bae018c155';

-- 2. Encerrar viagens duplicadas do Luis Claudio
UPDATE viagens SET status = 'encerrado', encerrado = true,
  h_fim_real = NOW(), observacao = COALESCE(observacao || ' | ', '') || 'Encerrado manualmente - viagem duplicada'
WHERE id IN ('1e9bd87d-4729-41fb-8fc5-7df49c352f1e', 'e44bb3e1-8fe3-4c00-bc45-45a61f407806');

-- Resetar status do Luis Claudio
UPDATE motoristas SET status = 'disponivel'
WHERE id = '249f1852-2843-4d6a-b014-8e15124da14a';

-- 3. Resetar status do Alexandre Lima
UPDATE motoristas SET status = 'disponivel'
WHERE id = '519d9895-192d-44d0-8e35-d776f4afe1e0';
```

---

## Parte 2: Protecao contra double-click

Adicionar debounce nos dois formularios de criacao de viagem para impedir que dois cliques rapidos criem registros duplicados.

### Arquivos modificados

**`src/components/app/CreateViagemMotoristaForm.tsx`**
- Adicionar `useRef` para rastrear submissao em andamento
- No inicio do `handleSubmit`, verificar se ja esta salvando (`if (saving) return`)
- Usar ref como trava instantanea (state pode ter delay por ser assincrono)

**`src/components/app/CreateViagemForm.tsx`**
- Mesma protecao: ref de submissao + early return se ja salvando

### Logica da protecao

```text
handleSubmit:
  1. if (submittingRef.current) return  // trava instantanea
  2. submittingRef.current = true
  3. setSaving(true)
  4. ... executar insert ...
  5. finally: setSaving(false); submittingRef.current = false
```

Isso garante que mesmo que o React ainda nao tenha atualizado o state `saving`, o ref ja bloqueia a segunda chamada.

