

# Plano: Corrigir Exclusão de Eventos

## Problema Principal

A exclusão de eventos está **falhando silenciosamente** por dois motivos:

### 1. Tabela `eventos` não tem política de DELETE

Conforme documentado nas políticas RLS:
```
Currently users **can't** do any of the following actions on the table eventos: 
- Can't DELETE records from the table
```

### 2. Tabelas relacionadas não estão sendo limpas

O código atual limpa apenas **6 das 10 tabelas** que referenciam `evento_id`:

| Tabela | Limpa no código? |
|--------|------------------|
| `evento_usuarios` | ✅ Sim |
| `viagens` | ✅ Sim |
| `motoristas` | ✅ Sim |
| `veiculos` | ✅ Sim |
| `pontos_embarque` | ✅ Sim |
| `rotas_shuttle` | ✅ Sim |
| `missoes` | ❌ **NÃO** |
| `motorista_presenca` | ❌ **NÃO** |
| `staff_credenciais` | ❌ **NÃO** |
| `veiculo_vistoria_historico` | ❌ **NÃO** |

---

## Solução

### Parte 1: Adicionar política de DELETE na tabela `eventos`

Criar uma migration para adicionar a política RLS de DELETE:

```sql
CREATE POLICY "Allow all delete on eventos"
ON public.eventos
FOR DELETE
USING (true);
```

### Parte 2: Completar a limpeza de dados relacionados

Atualizar `EventoGroupCard.tsx` para limpar **todas as 10 tabelas** antes de deletar o evento, na ordem correta (considerando dependências):

```typescript
const deleteEvent = async () => {
  setActionLoading(true);
  
  try {
    for (const evento of eventos) {
      // 1. Limpar tabelas que dependem de outras
      await supabase.from('missoes').delete().eq('evento_id', evento.id);
      await supabase.from('motorista_presenca').delete().eq('evento_id', evento.id);
      await supabase.from('veiculo_vistoria_historico').delete().eq('evento_id', evento.id);
      await supabase.from('staff_credenciais').delete().eq('evento_id', evento.id);
      
      // 2. Limpar tabelas principais
      await supabase.from('viagens').delete().eq('evento_id', evento.id);
      await supabase.from('motoristas').delete().eq('evento_id', evento.id);
      await supabase.from('veiculos').delete().eq('evento_id', evento.id);
      await supabase.from('pontos_embarque').delete().eq('evento_id', evento.id);
      await supabase.from('rotas_shuttle').delete().eq('evento_id', evento.id);
      await supabase.from('evento_usuarios').delete().eq('evento_id', evento.id);
    }

    // 3. Deletar o evento
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', primaryEvento.id);

    if (error) {
      console.error('Erro ao excluir evento:', error);
      toast.error('Erro ao excluir evento: ' + error.message);
    } else {
      toast.success('Evento excluído permanentemente');
      onUpdate?.();
    }
  } catch (err) {
    console.error('Erro inesperado:', err);
    toast.error('Erro inesperado ao excluir evento');
  }
  
  setActionLoading(false);
  setDeleteDialogOpen(false);
};
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migration | Adicionar política de DELETE em `eventos` |
| `src/components/eventos/EventoGroupCard.tsx` | Limpar todas as 10 tabelas + melhor tratamento de erro |

---

## Seção Técnica

### Migration SQL

```sql
-- Adicionar política de DELETE na tabela eventos
CREATE POLICY "Allow all delete on eventos"
ON public.eventos
FOR DELETE
USING (true);
```

### Ordem de Exclusão (respeitando dependências)

```text
1. missoes              (depende de motoristas, viagens)
2. motorista_presenca   (depende de motoristas, veiculos)
3. veiculo_vistoria_historico (depende de veiculos, motoristas)
4. staff_credenciais    (depende de evento_usuarios)
5. viagens              (tabela principal)
6. motoristas           (tabela principal)
7. veiculos             (tabela principal)
8. pontos_embarque      (tabela principal)
9. rotas_shuttle        (tabela principal)
10. evento_usuarios     (tabela principal)
11. eventos             (tabela pai - por último)
```

### Log para Debug

Adicionar logs para identificar qual tabela está falhando:

```typescript
const deleteFromTable = async (table: string, eventoId: string) => {
  const { error, count } = await supabase
    .from(table)
    .delete()
    .eq('evento_id', eventoId);
  
  if (error) {
    console.error(`Erro ao limpar ${table}:`, error);
    throw error;
  }
  console.log(`[Delete] ${table}: ${count || 0} registros removidos`);
};
```

---

## Resultado Esperado

1. **Exclusão funciona** - eventos são removidos do banco
2. **Dados relacionados excluídos** - todas as 10 tabelas são limpas
3. **UI atualiza imediatamente** - o `onUpdate()` dispara refetch
4. **Feedback claro** - erros são mostrados ao usuário com detalhes

