
# Plano: Correção de Erros Críticos no Sistema

## Problemas Identificados

### Problema 1: Localização incorreta ao finalizar Missão/Viagem

**Causa Raiz Identificada:**
No arquivo `src/pages/app/AppMotorista.tsx`, a função `handleMissaoAction` quando `action === 'finalizar'` (linhas 193-235):
1. Finaliza a viagem **sem** atualizar a `ultima_localizacao` do motorista
2. Usa `new Date()` local ao invés do horário sincronizado do servidor

O código atual apenas:
- Atualiza o status da viagem para "encerrado"
- Verifica se há outras viagens ativas
- Atualiza status do motorista para "disponivel"

**Mas NÃO atualiza** a `ultima_localizacao` do motorista para o `ponto_desembarque` da missão.

```text
FLUXO ATUAL (INCORRETO):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Finalizar   │ --> │ Viagem =    │ --> │ Motorista = │
│ Missão      │     │ encerrado   │     │ disponivel  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              ↓
                                        ultima_localizacao
                                        NÃO ATUALIZADA!
                                        (continua como "Base")

FLUXO CORRETO (A IMPLEMENTAR):
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│ Finalizar   │ --> │ Viagem =    │ --> │ Motorista =     │
│ Missão      │     │ encerrado   │     │ disponivel +    │
└─────────────┘     └─────────────┘     │ ultima_loc =    │
                                        │ ponto_desembarque│
                                        └─────────────────┘
```

---

### Problema 2: Sincronização de Horário com São Paulo

**Causa Raiz Identificada:**
Em vários pontos do código, `new Date()` é usado diretamente ao invés de `getAgoraSync()`:

| Arquivo | Linha | Código Problemático |
|---------|-------|---------------------|
| `AppMotorista.tsx` | 144 | `const now = new Date()` (iniciar missão) |
| `AppMotorista.tsx` | 204 | `const now = new Date()` (finalizar missão) |
| `Motoristas.tsx` | 287 | `new Date().toISOString()` (atualizar localização) |

O hook `useServerTime` já existe e funciona corretamente:
- A função RPC `get_server_time()` retorna `NOW() AT TIME ZONE 'America/Sao_Paulo'`
- O hook calcula o offset entre o cliente e o servidor
- `getAgoraSync()` retorna a hora correta compensada

**Problema:** O código usa `new Date()` diretamente em vez de `getAgoraSync()`.

---

### Problema 3: Motorista não consegue criar corrida

**Análise:**
Após revisar o código, o `CreateViagemMotoristaForm.tsx` está correto:
- Usa `useDriverAuth()` para obter `driverSession`
- Define `iniciado_por` e `criado_por` com `driverSession?.motorista_id`
- As políticas RLS permitem INSERT com `WITH CHECK (true)`

**Possíveis causas adicionais:**
1. O motorista pode não ter veículo vinculado (não é obrigatório)
2. Pode haver erro de validação no frontend antes de submeter
3. A sessão do motorista pode estar expirada

Vou adicionar logs de diagnóstico e melhorar o tratamento de erros.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/app/AppMotorista.tsx` | MODIFICAR | Corrigir `handleMissaoAction` para atualizar localização e usar horário sincronizado |
| `src/pages/Motoristas.tsx` | MODIFICAR | Substituir `new Date()` por `getAgoraSync()` |
| `src/components/app/CreateViagemMotoristaForm.tsx` | MODIFICAR | Adicionar logs de diagnóstico e melhorar feedback de erro |

---

## Detalhes da Implementação

### 1. Correção do `handleMissaoAction` em `AppMotorista.tsx`

**Mudanças necessárias:**

1. Importar `useServerTime` e usar `getAgoraSync()`
2. Ao finalizar missão, atualizar `ultima_localizacao` do motorista

```typescript
// ANTES (linhas 193-235):
} else if (action === 'finalizar') {
  const motorista = motoristas.find(m => m.id === missao.motorista_id);
  if (!motorista) { return; }
  
  const viagemId = missao.viagem_id;
  if (viagemId) {
    const now = new Date(); // ❌ Usa hora local
    const horaChegada = now.toTimeString().slice(0, 8);
    
    await supabase.from('viagens').update({
      status: 'encerrado',
      h_chegada: horaChegada,
      h_fim_real: now.toISOString(),
      encerrado: true,
    }).eq('id', viagemId);
  }
  
  // Verificar outras viagens e atualizar status
  // ❌ NÃO ATUALIZA ultima_localizacao!
}

// DEPOIS:
} else if (action === 'finalizar') {
  const motorista = motoristas.find(m => m.id === missao.motorista_id);
  if (!motorista) { return; }
  
  const viagemId = missao.viagem_id;
  const now = getAgoraSync(); // ✅ Usa hora sincronizada
  const horaChegada = now.toTimeString().slice(0, 8);
  
  if (viagemId) {
    await supabase.from('viagens').update({
      status: 'encerrado',
      h_chegada: horaChegada,
      h_fim_real: now.toISOString(),
      encerrado: true,
      finalizado_por: driverSession?.motorista_id || null,
    }).eq('id', viagemId);
  }
  
  // Verificar outras viagens
  const { data: outrasViagens } = await supabase
    .from('viagens').select('id')
    .eq('motorista_id', motorista.id)
    .eq('evento_id', eventoId)
    .eq('encerrado', false);
  
  if (!outrasViagens || outrasViagens.length === 0) {
    await supabase.from('motoristas').update({ 
      status: 'disponivel' 
    }).eq('id', missao.motorista_id);
  }
  
  // ✅ ATUALIZAR LOCALIZAÇÃO PARA O PONTO DE DESEMBARQUE
  if (missao.ponto_desembarque) {
    await supabase.from('motoristas').update({
      ultima_localizacao: missao.ponto_desembarque,
      ultima_localizacao_at: now.toISOString()
    }).eq('id', missao.motorista_id);
  }
  
  await updateMissao(missaoId, { status: 'concluida' });
}
```

### 2. Correção ao Iniciar Missão

Também precisamos usar hora sincronizada ao iniciar a missão (linha 144):

```typescript
// ANTES:
const now = new Date();

// DEPOIS:
const now = getAgoraSync();
```

### 3. Correção no `Motoristas.tsx`

```typescript
// ANTES (linha 287):
ultima_localizacao_at: new Date().toISOString(),

// DEPOIS:
const { getAgoraSync } = useServerTime();
// ...
ultima_localizacao_at: getAgoraSync().toISOString(),
```

### 4. Melhoria no `CreateViagemMotoristaForm.tsx`

Adicionar melhor feedback de erro:

```typescript
// Adicionar no handleSubmit:
console.log('[CreateViagemMotoristaForm] Tentando criar viagem:', {
  eventoId,
  motoristaId: driverSession?.motorista_id,
  pontoEmbarque,
  pontoDesembarque,
  tipoOperacao
});

// Melhorar tratamento de erro:
if (error) {
  console.error('[CreateViagemMotoristaForm] Erro detalhado:', error);
  toast.error(`Erro ao criar viagem: ${error.message}`);
  return;
}
```

---

## Seção Técnica

### Verificação da Sincronização de Tempo

O sistema já possui a infraestrutura correta:

```sql
-- Função no banco (já existe)
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamp with time zone
LANGUAGE sql STABLE SECURITY DEFINER
AS $function$
  SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
$function$
```

```typescript
// Hook useServerTime (já existe)
const getAgoraSync = useCallback(() => {
  return new Date(Date.now() + offset);
}, [offset]);
```

O problema é que alguns componentes não estão usando este hook.

### Fluxo de Atualização de Localização

Ao finalizar qualquer viagem (via missão ou diretamente), a localização deve ser atualizada:

```text
1. Motorista finaliza viagem/missão
2. Sistema verifica ponto_desembarque da viagem/missão
3. Sistema atualiza motoristas.ultima_localizacao = ponto_desembarque
4. Sistema atualiza motoristas.ultima_localizacao_at = timestamp sincronizado
5. Painel Localizador exibe motorista na coluna correta
```

### Garantia de Consistência

Para evitar problemas futuros, todas as operações de tempo devem passar por `getAgoraSync()`:

| Operação | Fonte de Tempo |
|----------|---------------|
| Iniciar viagem | `getAgoraSync()` |
| Registrar chegada | `getAgoraSync()` |
| Finalizar missão | `getAgoraSync()` |
| Check-in | `getAgoraSync()` |
| Check-out | `getAgoraSync()` |
| Atualizar localização | `getAgoraSync()` |

---

## Ordem de Implementação

1. Modificar `AppMotorista.tsx`:
   - Adicionar import de `useServerTime`
   - Substituir `new Date()` por `getAgoraSync()` em todo o componente
   - Adicionar atualização de `ultima_localizacao` na finalização de missão

2. Modificar `Motoristas.tsx`:
   - Adicionar import de `useServerTime`
   - Substituir `new Date().toISOString()` por `getAgoraSync().toISOString()`

3. Modificar `CreateViagemMotoristaForm.tsx`:
   - Adicionar logs de diagnóstico
   - Melhorar mensagens de erro

4. Testar fluxos completos:
   - Criar viagem como motorista
   - Iniciar e finalizar viagem
   - Iniciar e finalizar missão
   - Verificar localização no Painel Localizador

---

## Resultado Esperado

Após as correções:

1. **Localização correta**: Ao finalizar uma missão que vai do "Jockey" ao "Sheraton", o motorista aparecerá no Painel Localizador na coluna "Sheraton", não na "Base".

2. **Horário sincronizado**: Todos os timestamps serão baseados no fuso horário de Brasília/São Paulo, independente do dispositivo do usuário.

3. **Criação de viagens funcional**: O motorista conseguirá criar viagens de todos os tipos (Transfer, Shuttle, Missão) com feedback claro de erros se houver problemas.
