

# Exibir Veiculo + Placa nos Cards de Missao (Kanban e Lista)

## Objetivo
Adicionar uma linha com o nome (apelido) e placa do veiculo logo abaixo do nome do motorista em cada card de missao, seguindo a ordem:

```text
+---------------------------+
| [Badge Prioridade]   [...] |
| Titulo da Missao           |
| [User] Motorista           |
| [Car]  Veiculo - ABC1234   |
| [Pin]  Origem -> Destino   |
| [Clock] 14:30  [PAX] 3     |
+---------------------------+
```

## Mudancas

### 1. Hook `useMissoes.ts` - Buscar dados do veiculo junto com o motorista

A query atual faz:
```
select *, motorista:motoristas(nome)
```

Precisa expandir para incluir o veiculo vinculado ao motorista:
```
select *, motorista:motoristas(nome, veiculo_id, veiculos(nome, placa))
```

Isso traz o veiculo atualmente vinculado ao motorista sem queries adicionais.

Atualizar a interface `MissaoWithMotorista` e o tipo `Missao` para incluir `veiculo_nome` e `veiculo_placa`.

Na formatacao, extrair `m.motorista?.veiculos?.nome` e `m.motorista?.veiculos?.placa`.

### 2. Interface `Missao` - Novos campos

Adicionar ao tipo `Missao`:
- `veiculo_nome?: string`
- `veiculo_placa?: string`

### 3. Card `MissaoKanbanCard.tsx` - Nova linha visual

Adicionar uma linha entre o motorista e a rota com icone de carro (lucide `Car`), exibindo:
- Nome do veiculo (se existir) + placa, no formato: **Viatura 1** - ABC1234
- Se so tiver placa: ABC1234
- Se nao tiver veiculo: nao exibe a linha

### 4. Componente `MissaoBadge.tsx` - Mesma info no popover

Adicionar a info do veiculo no dropdown de detalhes da missao, caso seja relevante (opcional, baixa prioridade).

## Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useMissoes.ts` | Expandir query para incluir veiculo via motorista, adicionar campos ao tipo Missao |
| `src/components/motoristas/MissaoKanbanCard.tsx` | Adicionar linha de veiculo+placa abaixo do motorista |

