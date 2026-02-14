

# Correcao: Dessincronizacao entre Kanban de Missoes e Localizador

## Problema identificado

Existem **3 pontos criticos** onde a validacao de missao unica por motorista e burlada:

### Bug 1: Drag-and-drop ignora validacao
No `MissoesPanel.tsx` (linha 149), quando o operador arrasta uma missao para a coluna "Aceita" ou "Em Andamento", o sistema chama `updateMissao` diretamente -- sem verificar se o motorista ja tem outra missao ativa.

```text
// ATUAL (sem validacao):
await updateMissao(missaoId, { status: newStatus });

// O correto seria chamar aceitarMissao() ou iniciarMissao()
```

### Bug 2: Dropdown menu ignora validacao
No `MissoesPanel.tsx` (linha 325), o `onStatusChange` do card/kanban tambem chama `updateMissao` direto, sem passar pela validacao.

### Bug 3: Validacao usa estado local (stale data)
Mesmo quando `aceitarMissao`/`iniciarMissao` sao chamados (no hook `useMissoes.ts`), a verificacao e feita contra `missoes` (estado React local), que pode estar desatualizado. Se dois operadores aceitam missoes simultaneamente, ambos passam pela validacao porque o estado local de cada um ainda nao reflete a mudanca do outro.

## Solucao

### 1. Centralizar validacao com consulta ao banco (useMissoes.ts)

Substituir a validacao local por uma **query ao banco de dados** antes de aceitar ou iniciar:

```text
const aceitarMissao = async (id: string) => {
  const missao = missoes.find(m => m.id === id);
  if (!missao) return null;

  // Consulta ao banco (fonte da verdade)
  const { data: ativas } = await supabase
    .from('missoes')
    .select('id')
    .eq('motorista_id', missao.motorista_id)
    .eq('evento_id', eventoId)
    .in('status', ['aceita', 'em_andamento'])
    .neq('id', id)
    .limit(1);

  if (ativas && ativas.length > 0) {
    toast.error('Este motorista ja possui uma missao ativa.');
    fetchMissoes(); // Sincronizar estado local
    return null;
  }

  return updateMissao(id, { status: 'aceita' });
};
```

Mesma logica para `iniciarMissao`, verificando se ja existe missao `em_andamento`.

### 2. Rotear drag-and-drop pela validacao (MissoesPanel.tsx)

No `handleMissaoDragEnd`, ao invés de chamar `updateMissao` diretamente, rotear para a funcao correta conforme o status de destino:

```text
const handleMissaoDragEnd = async (event) => {
  // ... validacoes basicas ...

  if (newStatus === 'aceita') {
    await aceitarMissao(missaoId);
  } else if (newStatus === 'em_andamento') {
    await iniciarMissao(missaoId);
  } else if (newStatus === 'concluida') {
    await concluirMissao(missaoId);
  } else if (newStatus === 'cancelada') {
    await cancelarMissao(missaoId);
  } else {
    await updateMissao(missaoId, { status: newStatus });
  }
};
```

### 3. Rotear dropdown pela validacao (MissoesPanel.tsx)

O `onStatusChange` nos cards (kanban, card e lista) tambem passara pelas funcoes validadas:

```text
const handleStatusChange = async (missaoId: string, newStatus: string) => {
  if (newStatus === 'aceita') await aceitarMissao(missaoId);
  else if (newStatus === 'em_andamento') await iniciarMissao(missaoId);
  else if (newStatus === 'concluida') await concluirMissao(missaoId);
  else if (newStatus === 'cancelada') await cancelarMissao(missaoId);
  else await updateMissao(missaoId, { status: newStatus as MissaoStatus });
};
```

Substituir todas as 3 ocorrencias de `onStatusChange={(status) => updateMissao(...)}`  por `onStatusChange={(status) => handleStatusChange(missao.id, status)}`.

### 4. Expor funcoes validadas do hook

O `MissoesPanel` atualmente importa apenas `updateMissao` e `deleteMissao`. Passar a importar tambem `aceitarMissao`, `iniciarMissao`, `concluirMissao` e `cancelarMissao`:

```text
const { 
  missoes, loading, createMissao, updateMissao, deleteMissao,
  aceitarMissao, iniciarMissao, concluirMissao, cancelarMissao
} = useMissoes(eventoId);
```

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useMissoes.ts` | `aceitarMissao` e `iniciarMissao`: substituir validacao local por query ao banco + refetch em caso de conflito |
| `src/components/motoristas/MissoesPanel.tsx` | Drag-and-drop e dropdown: rotear por `aceitarMissao`/`iniciarMissao`/`concluirMissao`/`cancelarMissao` em vez de `updateMissao` direto |

## Impacto

- Elimina a possibilidade de aceitar duas missoes para o mesmo motorista (CCO)
- Elimina a possibilidade de iniciar missao quando outra esta em andamento (CCO)
- Garante sincronizacao entre o Kanban de missoes e o Localizador (mesma fonte de dados)
- Funciona mesmo com multiplos operadores atuando simultaneamente

