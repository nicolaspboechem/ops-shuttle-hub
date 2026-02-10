
# Mostrar apelido do veiculo como info principal nos motoristas

## Onde mudar

Existem 3 locais que exibem o veiculo vinculado ao motorista:

### 1. Vista em Card (Motoristas.tsx, ~linha 743-746)
Atualmente mostra apenas a placa. Mudar para:
- Nome/apelido do veiculo como texto principal (quando existir)
- Placa em texto menor como complemento

### 2. Vista em Lista/Tabela (Motoristas.tsx, ~linha 850-854)
Atualmente mostra placa + badge tipo. Mudar para:
- Nome/apelido como texto principal
- Placa em code menor ao lado

### 3. Kanban Card (MotoristaKanbanCard.tsx, ~linha 241-244)
Atualmente mostra placa + badge tipo. Mudar para:
- Nome/apelido como texto principal
- Placa em code menor

## Logica

Em todos os 3 locais, aplicar:
- Se `veiculo.nome` existir: mostrar `veiculo.nome` como texto principal e `veiculo.placa` em tamanho menor
- Se `veiculo.nome` nao existir: manter a placa como info principal (comportamento atual)

## Tecnico

### `src/pages/Motoristas.tsx`

**Card view (~linha 743-746):**
```
<Truck className="w-4 h-4 text-muted-foreground" />
{veiculo.nome ? (
  <>
    <span className="text-xs font-medium">{veiculo.nome}</span>
    <code className="text-[10px] text-muted-foreground">{veiculo.placa}</code>
  </>
) : (
  <code className="text-xs">{veiculo.placa}</code>
)}
<Badge variant="outline" className="text-xs">{veiculo.tipo_veiculo}</Badge>
```

**Table view (~linha 851-853):**
```
{veiculo.nome ? (
  <>
    <span className="text-sm font-medium">{veiculo.nome}</span>
    <code className="text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">{veiculo.placa}</code>
  </>
) : (
  <code className="text-xs bg-muted px-1 py-0.5 rounded">{veiculo.placa}</code>
)}
<Badge variant="outline" className="text-xs">{veiculo.tipo_veiculo}</Badge>
```

### `src/components/motoristas/MotoristaKanbanCard.tsx`

**Kanban card (~linha 242-244):**
```
<TipoIcon className="w-4 h-4 text-muted-foreground" />
{veiculo.nome ? (
  <>
    <span className="font-medium">{veiculo.nome}</span>
    <code className="text-[10px] text-muted-foreground">{veiculo.placa}</code>
  </>
) : (
  <code className="font-medium">{veiculo.placa}</code>
)}
<Badge variant="outline" className="text-[10px] px-1.5 py-0">{veiculo.tipo_veiculo}</Badge>
```

Nenhuma mudanca de logica ou banco de dados necessaria -- o campo `nome` ja existe no tipo `Veiculo` e ja e carregado nas queries.
