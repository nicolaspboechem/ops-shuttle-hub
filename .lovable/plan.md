
# Escala de Motoristas - Kanban com Colunas Colapsaveis e Edicao

## Resumo

Substituir o layout atual de dois paineis (split-pane com Select) por um layout Kanban horizontal onde **todas as escalas aparecem como colunas lado a lado**, cada uma podendo ser recolhida lateralmente. Adicionar botao de editar em cada coluna que reabre o wizard com os dados preenchidos.

---

## Alteracoes

### 1. Reescrever `MotoristasEscala.tsx`

Remover o layout de `ResizablePanelGroup` com dois paineis e Select. Substituir por:

- Container horizontal com scroll (`flex overflow-x-auto gap-3`)
- Cada escala renderizada como uma **coluna Kanban** (componente `EscalaKanbanColumn`)
- Cada coluna tem:
  - Header com nome da escala, horario, contagem de motoristas e ativos
  - Botao de recolher (ChevronLeft) que colapsa a coluna para uma barra vertical estreita (48px) - mesmo padrao do `MapaServicoColumn`
  - Botao de editar (Pencil) que abre o wizard em modo edicao
  - Botao de excluir (Trash2) com confirmacao
  - Botao de remover motorista (UserMinus) em cada card, visivel no hover
- Estado `collapsedIds` (Set) controla quais colunas estao recolhidas
- Coluna recolhida mostra: seta para expandir, nome vertical, badge com contagem

### 2. Adicionar modo edicao ao `CreateEscalaWizard.tsx`

- Aceitar prop opcional `escalaParaEditar?: Escala`
- Quando presente, pre-preencher nome, horario_inicio, horario_fim e motoristas selecionados
- Titulo muda para "Editar Escala" em vez de "Nova Escala"
- Botao muda para "Salvar" em vez de "Criar Escala"
- Aceitar callback `onEdit` alem do `onSubmit`

### 3. Adicionar `updateEscala` ao hook `useEscalas.ts`

Nova funcao que:
- Atualiza nome, horario_inicio, horario_fim na tabela `escalas`
- Sincroniza motoristas: remove os que foram desmarcados, adiciona os novos
- Expor no return do hook

### 4. Coluna colapsada (padrao MapaServicoColumn)

Quando colapsada:
```text
+------+
| [>]  |   <- chevron para expandir
|  3   |   <- badge com contagem
|  T   |
|  u   |   <- nome vertical (writing-mode: vertical-lr, rotate 180)
|  r   |
|  n   |
|  o   |
|  A   |
+------+
```
Largura: 48px. Clicar expande de volta.

---

## Detalhes Tecnicos

### MotoristasEscala.tsx - Nova estrutura

```text
<div className="flex flex-col h-full">
  {/* Top bar com titulo + botao Nova Escala */}

  <div className="flex-1 overflow-x-auto">
    <div className="flex gap-3 h-full p-1">
      {escalas.map(escala => (
        <EscalaKanbanColumn
          key={escala.id}
          escala={escala}
          motoristas={...}
          getPresenca={getPresenca}
          collapsed={collapsedIds.has(escala.id)}
          onToggleCollapse={() => toggle(escala.id)}
          onEdit={() => openEditWizard(escala)}
          onDelete={() => handleDelete(escala.id)}
          onRemoveMotorista={(mid) => removeMotoristaFromEscala(escala.id, mid)}
        />
      ))}
    </div>
  </div>
</div>
```

### useEscalas.ts - updateEscala

```text
const updateEscala = async (escalaId: string, data: CreateEscalaData) => {
  // 1. Update escalas table (nome, horarios)
  await supabase.from('escalas').update({...}).eq('id', escalaId);

  // 2. Get current motorista_ids for this escala
  // 3. Delete removed ones
  // 4. Insert new ones
  await fetchEscalas();
};
```

### CreateEscalaWizard - modo edicao

- Nova prop: `escalaParaEditar?: Escala & { motorista_ids: string[] }`
- `useEffect` que pre-preenche os campos quando `escalaParaEditar` muda
- Submit chama `onEdit` em vez de `onSubmit` quando em modo edicao

---

## Arquivos alterados

| Arquivo | Acao |
|---------|------|
| `src/components/motoristas/MotoristasEscala.tsx` | Reescrever: kanban horizontal com colunas colapsaveis |
| `src/components/motoristas/CreateEscalaWizard.tsx` | Adicionar modo edicao (pre-preencher campos) |
| `src/hooks/useEscalas.ts` | Adicionar funcao `updateEscala` |
