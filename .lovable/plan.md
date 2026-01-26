

# Plano: Adicionar Opção "Missão" no Formulário de Criação de Corrida do Motorista

## Objetivo

Adicionar a opção "Missão" no dropdown de tipo de operação no formulário `CreateViagemMotoristaForm`, permitindo que motoristas criem viagens do tipo missão manualmente. A diferença principal é que **missões encerram diretamente ao registrar chegada**, sem passar pelo estado "aguardando_retorno" que o Shuttle utiliza.

---

## Contexto e Diferença entre Tipos

| Tipo | Fluxo ao Registrar Chegada |
|------|----------------------------|
| **Transfer** | Encerra diretamente |
| **Shuttle** | Pode aguardar retorno (standby na base) |
| **Missão** | Encerra diretamente (igual Transfer) |

A lógica atual em `useViagemOperacao.ts` (linha 161-163) já trata isso:
```typescript
const novoStatus = (aguardarRetorno && viagem.tipo_operacao === 'shuttle') 
  ? 'aguardando_retorno' 
  : 'encerrado';
```

Ou seja, apenas Shuttle pode entrar em "aguardando_retorno". Transfer e Missão encerram direto.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/app/CreateViagemMotoristaForm.tsx` | MODIFICAR | Adicionar opção "Missão" no dropdown |

---

## Detalhes da Implementação

### Modificar o Select de Tipo de Operação

**Antes (linhas 360-370):**
```tsx
<Select value={tipoOperacao} onValueChange={setTipoOperacao}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="transfer">Transfer</SelectItem>
    <SelectItem value="shuttle">Shuttle</SelectItem>
  </SelectContent>
</Select>
```

**Depois:**
```tsx
<Select value={tipoOperacao} onValueChange={setTipoOperacao}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="transfer">Transfer</SelectItem>
    <SelectItem value="shuttle">Shuttle</SelectItem>
    <SelectItem value="missao">Missão</SelectItem>
  </SelectContent>
</Select>
```

---

## Fluxo Esperado

1. Motorista abre formulário de "Nova Viagem" no app
2. Seleciona tipo **"Missão"** no dropdown
3. Preenche pontos de embarque/desembarque e PAX
4. Clica em "Criar e Iniciar"
5. Viagem é criada com `tipo_operacao: 'missao'` e `status: 'em_andamento'`
6. Motorista aparece no Localizador como "Em Trânsito"
7. Ao clicar em "CHEGOU":
   - Viagem encerra diretamente (`status: 'encerrado'`)
   - **SEM** estado intermediário "aguardando_retorno"
   - Localização do motorista atualiza para ponto de desembarque

---

## Visual no App

```text
┌──────────────────────────────────────────┐
│            Nova Viagem                   │
├──────────────────────────────────────────┤
│                                          │
│  Motorista: João Silva                   │
│  Veículo: ABC-1234 - Van                 │
│                                          │
│  Ponto de Embarque *                     │
│  ┌──────────────────────────────────┐   │
│  │ Base                           ▼ │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Ponto de Desembarque *                  │
│  ┌──────────────────────────────────┐   │
│  │ Hotel Copacabana               ▼ │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌────────────┐  ┌───────────────────┐   │
│  │  Qtd PAX * │  │  Tipo *           │   │
│  │    3       │  │  Missão      ▼    │   │  ← Nova opção
│  └────────────┘  │  • Transfer       │   │
│                  │  • Shuttle        │   │
│                  │  • Missão  ✓      │   │
│                  └───────────────────┘   │
│                                          │
│  Observação                              │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [Cancelar]      [Criar e Iniciar]       │
└──────────────────────────────────────────┘
```

---

## Seção Técnica

### Alteração no Componente

Apenas uma linha adicionada no Select:

```tsx
<SelectItem value="missao">Missão</SelectItem>
```

### Por que funciona automaticamente?

A lógica de encerramento já está pronta em `useViagemOperacao.ts`:

```typescript
// Shuttle pode aguardar retorno, outros tipos encerram diretamente
const novoStatus = (aguardarRetorno && viagem.tipo_operacao === 'shuttle') 
  ? 'aguardando_retorno' 
  : 'encerrado';
```

Como `tipo_operacao !== 'shuttle'` para missão, a viagem encerra diretamente.

### Comportamento no Localizador

Ao criar viagem tipo missão:
1. Motorista aparece na coluna "Em Trânsito"
2. Ao encerrar, motorista move para coluna do ponto de desembarque

### Observações

- Não é necessário modificar `useViagemOperacao.ts` - a lógica já trata corretamente
- Não é necessário modificar `ViagemCardMobile.tsx` - o botão "CHEGOU" funciona igual
- A viagem criada com tipo "missao" será exibida com badge de Missão automaticamente nas tabelas do CCO
- Compatível com todo o sistema de auditoria existente

