

# Plano: Corrigir Erro 400 na Vinculacao e Warnings de Dialog

## Causa Raiz Identificada

### Erro 400 - Trigger Incorreto no Banco de Dados
O erro 400 ao vincular veiculo **nao e** por falta de foreign keys (essas ja existem). A causa real e um **trigger** chamado `update_veiculos_updated_at` que executa a funcao `update_updated_at_column()`. Essa funcao tenta fazer `NEW.updated_at = NOW()`, mas a tabela `veiculos` usa o campo `data_atualizacao`, nao `updated_at`. 

Toda operacao de UPDATE na tabela `veiculos` falha por causa desse trigger.

### Warning: Missing Description for DialogContent
Varios componentes usam `DialogContent` sem incluir `DialogDescription`, gerando warnings de acessibilidade no console. O fix e adicionar `aria-describedby={undefined}` aos dialogs que nao precisam de descricao.

---

## Mudancas Necessarias

### 1. Migracao SQL - Corrigir ou Remover o Trigger

Opcao mais limpa: remover o trigger incorreto, ja que a coluna `data_atualizacao` e atualizada manualmente pelo codigo (via `atualizado_por` no hook).

```sql
-- Remover trigger que referencia coluna inexistente
DROP TRIGGER IF EXISTS update_veiculos_updated_at ON public.veiculos;
```

### 2. Suprimir Warnings de DialogContent

Adicionar `aria-describedby={undefined}` nos `DialogContent` que nao possuem `DialogDescription`. Arquivos afetados:

| Arquivo | Dialogs sem Description |
|---------|------------------------|
| `CreateMotoristaWizard.tsx` | Wizard dialog |
| `CreateVeiculoWizard.tsx` | Wizard dialog |
| `MotoristaViagensModal.tsx` | Modal de viagens |
| `MissaoModal.tsx` | Modal de missao |
| `PresencaDiaModal.tsx` | Modal de presenca |
| `VeiculoDetalheModal.tsx` | Modal de detalhe |
| `VeiculoAuditoriaDiaModal.tsx` | Modal de auditoria |
| `VistoriaDetalheModal.tsx` | Modal de vistoria |
| `VeiculoUsoDetalheModal.tsx` | Modal de uso |
| `CadastroModals.tsx` | 3 modais de cadastro |
| `ViagemCardOperador.tsx` | Dialog de PAX |
| `EditMotoristaLoginModal.tsx` | Dialog de sucesso (sem header) |

A correcao e simples - adicionar a prop em cada `DialogContent`:

```tsx
// Antes
<DialogContent className="...">

// Depois
<DialogContent aria-describedby={undefined} className="...">
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Remover trigger `update_veiculos_updated_at` |
| `CreateMotoristaWizard.tsx` | Adicionar `aria-describedby={undefined}` |
| `CreateVeiculoWizard.tsx` | Adicionar `aria-describedby={undefined}` |
| `MotoristaViagensModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `MissaoModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `PresencaDiaModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `VeiculoDetalheModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `VeiculoAuditoriaDiaModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `VistoriaDetalheModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `VeiculoUsoDetalheModal.tsx` | Adicionar `aria-describedby={undefined}` |
| `CadastroModals.tsx` | Adicionar `aria-describedby={undefined}` (3 dialogs) |
| `ViagemCardOperador.tsx` | Adicionar `aria-describedby={undefined}` |
| `EditMotoristaLoginModal.tsx` | Adicionar `aria-describedby={undefined}` (dialog de sucesso) |

---

## Resultado Esperado

1. **Vinculacao de veiculos funciona** - Sem erro 400, o UPDATE executa corretamente
2. **Console limpo** - Sem warnings de DialogContent
3. **Sem regressao** - O campo `data_atualizacao` continua sendo atualizado pelo codigo no hook

