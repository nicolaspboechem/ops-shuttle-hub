
# Plano: Edição Manual de Localização do Motorista no CCO

## Objetivo
Adicionar funcionalidade para que administradores possam editar manualmente a localização de um motorista diretamente no card do Kanban, através de um botão de edição ao lado da última localização.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/motoristas/EditarLocalizacaoModal.tsx` | **CRIAR** | Modal para selecionar nova localização |
| `src/components/motoristas/MotoristaKanbanCard.tsx` | MODIFICAR | Adicionar botão de editar localização |
| `src/components/motoristas/MotoristaKanbanColumn.tsx` | MODIFICAR | Passar handler de edição de localização |
| `src/pages/Motoristas.tsx` | MODIFICAR | Adicionar estado e lógica para o modal |

---

## Detalhes de Implementação

### 1. Criar `EditarLocalizacaoModal.tsx`

Modal com:
- Título "Editar Localização"
- Nome do motorista (readonly)
- Localização atual exibida
- Select dropdown com:
  - Opção "Base" (sempre disponível)
  - Todos os pontos de embarque ativos do evento
- Botões Cancelar/Salvar

```tsx
interface EditarLocalizacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: { id: string; nome: string };
  pontosEmbarque: Array<{ id: string; nome: string }>;
  localizacaoAtual: string | null;
  onSave: (motoristaId: string, novaLocalizacao: string) => Promise<void>;
}
```

### 2. Modificar `MotoristaKanbanCard.tsx`

Adicionar prop `onEditLocalizacao` e botão de editar:

```tsx
interface MotoristaKanbanCardProps {
  // ... props existentes
  onEditLocalizacao?: () => void;
}
```

Na seção de última localização, adicionar botão:

```text
┌─────────────────────────────────────────────────────┐
│ 📍 Última loc: Hotel Barra  [✏️]  ← Novo botão      │
└─────────────────────────────────────────────────────┘
```

Se não houver localização, mostrar:
```text
┌─────────────────────────────────────────────────────┐
│ 📍 Sem localização  [✏️]  ← Permite definir         │
└─────────────────────────────────────────────────────┘
```

### 3. Modificar `MotoristaKanbanColumn.tsx`

Adicionar prop `onEditLocalizacao` e passar para os cards:

```tsx
interface MotoristaKanbanColumnProps {
  // ... props existentes
  onEditLocalizacao: (motorista: Motorista) => void;
}
```

### 4. Modificar `Motoristas.tsx`

Adicionar:
- Estado `editLocMotorista` para controlar qual motorista está sendo editado
- Função `handleUpdateLocalizacao` para salvar no Supabase
- Renderização do `EditarLocalizacaoModal`

```tsx
const [editLocMotorista, setEditLocMotorista] = useState<Motorista | null>(null);

const handleUpdateLocalizacao = async (motoristaId: string, novaLocalizacao: string) => {
  const { error } = await supabase
    .from('motoristas')
    .update({ 
      ultima_localizacao: novaLocalizacao,
      ultima_localizacao_at: new Date().toISOString(),
      atualizado_por: user?.id
    })
    .eq('id', motoristaId);
  
  if (error) {
    toast.error('Erro ao atualizar localização');
    return;
  }
  
  toast.success('Localização atualizada');
  refetchMotoristas();
};
```

---

## Fluxo de Uso

1. Admin visualiza Kanban de Motoristas
2. No card, vê "Última loc: Hotel Barra [✏️]"
3. Clica no botão de editar (ícone lápis)
4. Modal abre com:
   - Nome do motorista
   - Localização atual
   - Dropdown com "Base" + pontos de embarque cadastrados
5. Seleciona nova localização
6. Clica em "Salvar"
7. `motoristas.ultima_localizacao` e `ultima_localizacao_at` são atualizados
8. Card reflete nova localização
9. Localizador de Frota atualiza automaticamente via Realtime

---

## Visual do Modal

```text
┌─────────────────────────────────────────────┐
│  Editar Localização                    [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Motorista: João Silva                      │
│                                             │
│  Localização Atual: Hotel Barra             │
│                                             │
│  Nova Localização:                          │
│  ┌─────────────────────────────────────┐   │
│  │ Selecione...                      ▼ │   │
│  └─────────────────────────────────────┘   │
│    • Base                                   │
│    • Aeroporto SDU                          │
│    • Hotel Copacabana                       │
│    • Centro de Convenções                   │
│                                             │
├─────────────────────────────────────────────┤
│           [Cancelar]    [Salvar]            │
└─────────────────────────────────────────────┘
```

---

## Seção Técnica

### Atualização no Banco

```sql
UPDATE motoristas 
SET 
  ultima_localizacao = 'Base',
  ultima_localizacao_at = NOW(),
  atualizado_por = '{user-uuid}'
WHERE id = '{motorista-uuid}';
```

### Integração com Realtime

O Localizador de Frota já possui subscription na tabela `motoristas`, então alterações serão refletidas automaticamente no painel TV sem necessidade de refresh.

### Observações

- O fluxo principal de localização continua automático (check-in → "Base", finalização → ponto_desembarque)
- Edição manual é para casos excepcionais/correções
- "Base" sempre disponível como opção (localização padrão)
- Botão de editar aparece sempre, mesmo sem localização definida (permite definir manualmente)
