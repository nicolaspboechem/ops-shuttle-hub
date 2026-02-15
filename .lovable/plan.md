

# Historico de Escalas com Veiculos e Historico de Veiculos Vinculados

## Resumo

Transformar o `MotoristaViagensModal` em um modal com 3 abas: **Viagens** (com filtro de data), **Escalas** (com veiculos vinculados durante cada escala) e **Veiculos** (historico completo de vinculacoes/desvinculacoes).

---

## 1. Adicionar prop `motoristaId` ao MotoristaViagensModal

O modal atualmente recebe apenas `motorista` (nome) e `viagens`. Precisa tambem do `motoristaId` para buscar escalas e historico de veiculos no banco.

**Onde passar o ID:**
- No `MotoristaDropdownActions` (linha ~465 de Motoristas.tsx) - ja tem acesso a `motoristaCadastrado?.id`
- No kanban via `onVerViagens` callback - ja passa o objeto `Motorista` que tem `.id`

## 2. Reformular MotoristaViagensModal com 3 abas

**Arquivo:** `src/components/motoristas/MotoristaViagensModal.tsx`

### Aba "Viagens"
- Filtro de data (`<Input type="date" />`) no topo
- KPIs recalculados com base no filtro
- Tabela de viagens filtrada
- Botao para limpar filtro

### Aba "Escalas"
- Buscar escalas do motorista via query:

```text
supabase
  .from('escala_motoristas')
  .select('id, created_at, escalas(id, nome, horario_inicio, horario_fim, cor, evento_id, created_at)')
  .eq('motorista_id', motoristaId)
```

- Para cada escala, cruzar com o historico de veiculos (`veiculo_vistoria_historico`) para mostrar qual veiculo estava vinculado durante aquele turno
- Query de historico de veiculos:

```text
supabase
  .from('veiculo_vistoria_historico')
  .select('id, tipo_vistoria, created_at, veiculo:veiculos!veiculo_id(placa, nome, tipo_veiculo)')
  .eq('motorista_id', motoristaId)
  .in('tipo_vistoria', ['vinculacao', 'desvinculacao'])
  .order('created_at', { ascending: true })
```

- Para cada escala, identificar os veiculos vinculados durante o periodo (created_at da escala vs timestamps de vinculacao/desvinculacao)
- Se mais de um veiculo foi vinculado durante a escala, mostrar todos com seus respectivos horarios

**Layout de cada card de escala:**

```text
[Cor] Turno A  (08:00 - 18:00)
      Criado em: 14/02/2026
      
      Veiculos:
      - Van TYJ0H74 "Apelido"  |  08:30 - 14:20
      - Van TKB0J35 "Outro"    |  14:25 - 18:00
```

### Aba "Veiculos"
- Historico completo de todas as vinculacoes/desvinculacoes do motorista
- Mesma query do `veiculo_vistoria_historico` acima
- Agrupar em pares vinculacao/desvinculacao para mostrar duracao
- Se so tem vinculacao sem desvinculacao, marcar como "Ativo" (ainda vinculado)

**Layout:**

```text
[Car] Van TYJ0H74 "Apelido"
      Vinculado: 15/02 08:30
      Desvinculado: 15/02 18:00  (9h30 de uso)

[Car] Van TKB0J35
      Vinculado: 14/02 09:00
      Desvinculado: 14/02 17:30  (8h30 de uso)
```

## 3. Atualizar chamadores em Motoristas.tsx

Passar `motoristaId` nas duas chamadas:

1. **MotoristaDropdownActions** (linha ~465): adicionar prop `motoristaId={motoristaCadastrado?.id}`
2. **Kanban via onVerViagens**: o `selectedMotoristaForViagens` ja e um objeto `Motorista` com `.id`

---

## Detalhes Tecnicos

### Arquivo alterado

| Arquivo | Acao |
|---------|------|
| `src/components/motoristas/MotoristaViagensModal.tsx` | Reformular com 3 abas (Viagens com filtro, Escalas com veiculos, Veiculos historico) |
| `src/pages/Motoristas.tsx` | Passar `motoristaId` ao MotoristaViagensModal |

### Logica de cruzamento escala x veiculos

Para determinar qual veiculo estava vinculado durante uma escala:

```text
// Historico de veiculos ordenado por data
// Para cada escala, filtrar vinculacoes cujo timestamp 
// esta dentro do periodo (created_at da escala +/- horarios)
// 
// Approach: usar o created_at da escala_motoristas como referencia
// e verificar quais vinculacoes existiam naquele periodo

// Simplificacao pratica: 
// - Buscar todos os registros de veiculo_vistoria_historico do motorista
// - Construir intervalos [vinculacao_at, desvinculacao_at] para cada veiculo
// - Para cada escala, verificar quais intervalos se sobrepoem
```

### Fetch de dados (dentro do modal, ao abrir)

Dois `useEffect` independentes executados quando o dialog abre:
1. Buscar escalas via `escala_motoristas` + `escalas`
2. Buscar historico de veiculos via `veiculo_vistoria_historico`

Ambos usam `motoristaId` e so executam quando o dialog esta aberto.

### Sem migracoes de banco necessarias

Todos os dados ja existem nas tabelas:
- `escala_motoristas` + `escalas` - escalas do motorista
- `veiculo_vistoria_historico` - historico de vinculacao/desvinculacao com `motorista_id`, `veiculo_id`, `tipo_vistoria`, `created_at`

