
# Plano: Corrigir Erro de Check-out no App Motorista

## Problema Identificado

O `CheckoutModal` usa `useAuth()` (Supabase Auth) para obter dados do usuário:

```typescript
const { user, profile } = useAuth();  // linha 42
```

Porém, no app do motorista, a autenticação é feita via **sistema customizado** (`useDriverAuth()`), não via Supabase Auth. Resultado:
- `user` e `profile` retornam `null`
- Ao tentar registrar histórico de vistoria com `user?.id = null`, pode haver erro de constraint ou RLS
- O modal pode falhar silenciosamente ou mostrar erro genérico

## Solução

Modificar o `CheckoutModal` para:
1. Receber dados do motorista via props (opcionais)
2. Usar esses dados ao invés de depender de `useAuth()`
3. Tornar o registro de vistoria resiliente quando não há sessão Supabase

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/app/CheckoutModal.tsx` | Usar props ao invés de useAuth() |
| `src/components/app/MotoristaHistoricoTab.tsx` | Passar dados do motorista para o modal |
| `src/pages/app/AppMotorista.tsx` | Passar eventoId e nome do motorista para o MotoristaHistoricoTab |

---

## Seção Técnica

### 1. Modificar CheckoutModal.tsx

**Remover dependência do useAuth():**

```typescript
// ANTES (linha 42)
const { user, profile } = useAuth();

// DEPOIS - usar props que já existem
// eventoId e motoristaNome já são props recebidas!
// Apenas usar elas e remover o useAuth
```

**Ajustar insert do histórico:**

```typescript
// ANTES
realizado_por: user?.id || null,
realizado_por_nome: profile?.full_name || null,

// DEPOIS - usar motorista_id da presença
realizado_por: presenca?.motorista_id || null,
realizado_por_nome: motoristaNome || null,
```

### 2. Modificar MotoristaHistoricoTab.tsx

**Adicionar props para eventoId e motoristaNome:**

```typescript
interface MotoristaHistoricoTabProps {
  viagensFinalizadas: Viagem[];
  presenca: MotoristaPresencaComVeiculo | null;
  onCheckout: (observacao?: string) => Promise<boolean>;
  loadingCheckout?: boolean;
  eventoId?: string;          // Nova prop
  motoristaNome?: string;     // Nova prop
}
```

**Passar para o CheckoutModal:**

```typescript
<CheckoutModal
  open={showCheckoutModal}
  onOpenChange={setShowCheckoutModal}
  presenca={presenca}
  viagensHoje={estatisticas.finalizadas}
  onConfirm={onCheckout}
  loading={loadingCheckout}
  eventoId={eventoId}           // Adicionar
  motoristaNome={motoristaNome} // Adicionar
/>
```

### 3. Modificar AppMotorista.tsx

**Passar props para MotoristaHistoricoTab:**

```typescript
case 'historico':
  return (
    <MotoristaHistoricoTab
      viagensFinalizadas={minhasViagensFinalizadas}
      presenca={presenca}
      onCheckout={realizarCheckout}
      loadingCheckout={loadingPresenca}
      eventoId={eventoId}              // Adicionar
      motoristaNome={nomeMotorista}    // Adicionar
    />
  );
```

---

## Fluxo Corrigido

```text
1. Motorista clica em "Encerrar Expediente" 
2. MotoristaHistoricoTab abre CheckoutModal com props (eventoId, motoristaNome)
3. CheckoutModal usa presenca.motorista_id para registrar histórico
4. Checkout é realizado com sucesso via realizarCheckout()
5. Modal fecha e estado é atualizado
```

---

## Resultado Esperado

1. Check-out funciona corretamente no app do motorista
2. Histórico de vistoria é registrado com motorista_id correto
3. Sem dependência de useAuth() que não existe no contexto do motorista
4. Modal fecha após sucesso e mostra mensagem de confirmação
