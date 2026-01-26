
# Plano: Correção de Erros em Viagens de Motorista e Funcionalidade de "Base"

## Problemas Identificados

### Problema 1: Erro ao Finalizar Viagem Iniciada pelo App do Motorista

**Causa raiz**: O formulário `CreateViagemMotoristaForm.tsx` usa `useAuth()` (linha 59) para obter o `user.id` e definir `iniciado_por`. Porém, motoristas usam autenticação customizada (`useDriverAuth()`), então `user` é **null**.

**Trecho problemático (linha 143)**:
```typescript
iniciado_por: user?.id  // user é null para motoristas!
```

Quando a viagem é criada com `iniciado_por: null`, o hook `useViagemOperacaoMotorista` funciona para iniciar e registrar chegada, mas pode haver problemas de log ou validações inconsistentes.

---

### Problema 2: Localização do Motorista Incorreta ao Encerrar Viagem

**Observação**: Ao analisar o código, verifiquei que o hook `useViagemOperacaoMotorista.ts` **já está correto**:

```typescript
// Linhas 185-192 do useViagemOperacaoMotorista.ts
// Atualizar localização do motorista para o ponto de desembarque
if (viagem.ponto_desembarque) {
  await atualizarLocalizacaoMotorista(
    driverSession.motorista_id, 
    viagem.ponto_desembarque,  // ← Atualiza para o destino, não para base
    now.toISOString()
  );
}
```

**Possível causa**: O problema pode estar em outro lugar:
1. O `ponto_desembarque` pode estar vindo como `null` em viagens criadas manualmente
2. A lógica de check-in define `ultima_localizacao` como 'Base' e sobrescreve

Vou verificar e corrigir o formulário de criação para garantir que o `ponto_desembarque` seja sempre preenchido corretamente com o nome do ponto selecionado.

---

### Problema 3: Badge de "Base" nos Pontos de Embarque

**Requisito**: Permitir marcar UM ponto de embarque como "Base" por evento, com indicação visual.

**Solução**:
1. Adicionar coluna `eh_base` (boolean) na tabela `pontos_embarque`
2. Adicionar badge visual na lista de pontos
3. Adicionar switch/toggle no modal de edição
4. Garantir que apenas um ponto seja "base" por evento (desmarcar outros ao marcar novo)

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/app/CreateViagemMotoristaForm.tsx` | MODIFICAR | Usar `driverSession` ao invés de `user` para registro de auditoria |
| `src/hooks/usePontosEmbarque.ts` | MODIFICAR | Adicionar campo `eh_base` na interface e função `setBase` |
| `src/components/rotas/PontoEmbarqueModal.tsx` | MODIFICAR | Adicionar toggle para marcar como base |
| `src/pages/RotasShuttle.tsx` | MODIFICAR | Exibir badge "Base" na lista de pontos |

---

## Migração de Banco de Dados

Adicionar coluna `eh_base` na tabela `pontos_embarque`:

```sql
ALTER TABLE pontos_embarque 
ADD COLUMN eh_base BOOLEAN DEFAULT false;

-- Índice para garantir performance na busca por base
CREATE INDEX idx_pontos_embarque_base 
ON pontos_embarque(evento_id, eh_base) 
WHERE eh_base = true;
```

---

## Detalhes da Implementação

### 1. Correção do CreateViagemMotoristaForm

```typescript
// ANTES (problemático)
import { useAuth } from '@/lib/auth/AuthContext';
const { user } = useAuth();

// DEPOIS (corrigido)
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
const { driverSession } = useDriverAuth();

// Na criação da viagem:
iniciado_por: driverSession?.motorista_id || null,
criado_por: driverSession?.motorista_id || null,
```

### 2. Adicionar eh_base no Hook e Interface

**usePontosEmbarque.ts**:
```typescript
export interface PontoEmbarque {
  // ... campos existentes
  eh_base: boolean;  // novo campo
}

// Nova função para marcar como base
const setBase = async (pontoId: string) => {
  if (!eventoId) return;
  
  // 1. Desmarcar todos os outros pontos do evento
  await supabase
    .from('pontos_embarque')
    .update({ eh_base: false })
    .eq('evento_id', eventoId);
  
  // 2. Marcar o ponto selecionado
  await supabase
    .from('pontos_embarque')
    .update({ eh_base: true })
    .eq('id', pontoId);
  
  toast.success('Base definida');
  fetchPontos();
};
```

### 3. Interface Visual na Lista de Pontos

**RotasShuttle.tsx** - Badge de base:
```tsx
<div className="flex items-center gap-2 mb-1">
  <span className="font-medium">{ponto.nome}</span>
  {ponto.eh_base && (
    <Badge variant="default" className="text-xs bg-primary">
      🏠 Base
    </Badge>
  )}
  {!ponto.ativo && (
    <Badge variant="secondary" className="text-xs">Inativo</Badge>
  )}
</div>
```

### 4. Toggle no Modal de Edição

**PontoEmbarqueModal.tsx**:
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="ehBase">Marcar como Base</Label>
    <p className="text-xs text-muted-foreground">
      Define este ponto como local de base/retorno
    </p>
  </div>
  <Switch
    id="ehBase"
    checked={ehBase}
    onCheckedChange={setEhBase}
  />
</div>
```

---

## Fluxo de Localização do Motorista (Verificação)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE LOCALIZAÇÃO                                 │
├───────────────┬─────────────────────────────────────────────────────────┤
│ AÇÃO          │ LOCALIZAÇÃO APÓS                                        │
├───────────────┼─────────────────────────────────────────────────────────┤
│ Check-in      │ "Base" (definido no check-in)                           │
│ Iniciar Trip  │ Mantém localização anterior                             │
│ Encerrar Trip │ ponto_desembarque (destino da viagem)                   │
│ Check-out     │ Mantém localização atual                                │
└───────────────┴─────────────────────────────────────────────────────────┘
```

O código já está correto para definir localização como `ponto_desembarque`. Se não está funcionando, o problema pode ser que `viagem.ponto_desembarque` está vindo como `null`. Vou garantir que o formulário de criação manual sempre preencha esse campo.

---

## Ordem de Implementação

1. **Migração SQL**: Adicionar coluna `eh_base` na tabela
2. **Atualizar tipos**: `PontoEmbarque` interface e `PontoEmbarqueInput`
3. **Hook**: Adicionar função `setBase` e `pontoBase` getter
4. **Modal**: Adicionar toggle para marcar como base
5. **Lista**: Adicionar badge visual
6. **Formulário motorista**: Corrigir uso de `driverSession` ao invés de `user`

---

## Seção Técnica

### Garantia de Unicidade da Base

Ao marcar um ponto como base, primeiro desmarcamos TODOS os outros pontos do mesmo evento:

```typescript
// Transação lógica (não é ACID, mas funcional)
await supabase
  .from('pontos_embarque')
  .update({ eh_base: false })
  .eq('evento_id', eventoId)
  .neq('id', pontoId);  // Excluir o ponto que será marcado

await supabase
  .from('pontos_embarque')
  .update({ eh_base: true })
  .eq('id', pontoId);
```

### Uso da Base no Localizador

O painel localizador pode usar o ponto marcado como base para exibir uma coluna especial ou filtrar motoristas que estão na base:

```typescript
const pontoBase = pontos.find(p => p.eh_base);
```

### Correção do ponto_desembarque Vazio

No formulário de criação, garantir que o campo seja sempre preenchido mesmo que o ponto seja digitado manualmente (não selecionado do cadastro):

```typescript
ponto_desembarque: pontoDesembarque, // Sempre usa o texto selecionado/digitado
ponto_desembarque_id: pontoDesembarqueData?.id || null, // ID pode ser null para texto livre
```

Isso já está correto no código atual (linhas 130-136). O problema pode ser na **recuperação** da viagem quando `registrarChegada` é chamado - a viagem pode não ter `ponto_desembarque` populado se veio de uma query antiga.
