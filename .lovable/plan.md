

# Supervisor: Modal de Tipo + Criacao de Missoes

## Resumo

Quando o supervisor toca no botao "+" (Nova), em vez de abrir direto o formulario de Transfer/Shuttle, aparece primeiro um modal com 3 opcoes: **Missao**, **Transfer** e **Shuttle**. Selecionar Transfer ou Shuttle abre o drawer existente (`CreateViagemForm`) com o tipo pre-selecionado. Selecionar Missao abre o `MissaoModal` adaptado para mobile com busca de motorista.

## Alteracoes

### 1. Novo componente: `src/components/app/NewActionModal.tsx`

Modal simples (Dialog) com 3 botoes grandes em coluna:
- **Missao** (icone Target) -- cor roxa
- **Transfer** (icone ArrowRightLeft)
- **Shuttle** (icone Bus)

Cada botao chama um callback `onSelect(tipo)` e fecha o modal.

### 2. Arquivo: `src/pages/app/AppSupervisor.tsx`

Substituir a logica atual do botao "+":

**Antes:**
- `handleTabChange('nova')` abre direto `showNovaViagem = true`

**Depois:**
- `handleTabChange('nova')` abre `showActionModal = true`
- No `NewActionModal`, ao selecionar:
  - `'transfer'` ou `'shuttle'` → abre `CreateViagemForm` com `tipoOperacao` pre-definido
  - `'missao'` → abre `MissaoModal` (reaproveitado do CCO)

Novos states:
```
const [showActionModal, setShowActionModal] = useState(false);
const [showMissaoModal, setShowMissaoModal] = useState(false);
const [preselectedTipo, setPreselectedTipo] = useState<string>('transfer');
```

Imports adicionais: `MissaoModal`, `useMissoes`, `useMotoristas`, `usePontosEmbarque`.

### 3. Arquivo: `src/components/app/CreateViagemForm.tsx`

Adicionar prop opcional `defaultTipoOperacao` para pre-selecionar Transfer ou Shuttle quando abrir. No `useEffect` de reset, usar `defaultTipoOperacao` ao inves de hardcoded `'transfer'`.

### 4. Arquivo: `src/components/motoristas/MissaoModal.tsx`

Trocar o campo de motorista de `Select` simples para `Command` (combobox com busca), seguindo o mesmo padrao ja usado no `CreateViagemForm`. Isso permite pesquisar motoristas por nome no campo dropdown.

## Fluxo Visual

```text
[Supervisor toca "+"]
       |
  [Modal: Tipo]
  +-----------------+
  | [Target] Missao |  --> Abre MissaoModal (com busca de motorista)
  | [<->] Transfer  |  --> Abre CreateViagemForm (tipo=transfer)
  | [Bus] Shuttle   |  --> Abre CreateViagemForm (tipo=shuttle)
  +-----------------+
```

## O que NAO muda

- Funcionalidades do CCO permanecem intactas (vincular veiculo antes do check-in, cadastrar missoes antecipadamente)
- Check-in do motorista continua independente de veiculo (ja funciona assim)
- O `CreateViagemForm` existente continua funcionando normalmente, apenas recebe um tipo pre-selecionado
- O `useMissoes` hook ja suporta `createMissao` com `useAuth` -- o supervisor usa a mesma autenticacao admin

