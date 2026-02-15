

# Auditoria de Escalas com Filtro de Data

## Resumo

Criar uma nova secao "Auditoria Escalas" na pagina de Motoristas (CCO) que mostra o historico de escalas organizadas por dia, com o mesmo componente `DiaSeletor` usado no dashboard para navegar entre datas ou ver todos os dias.

---

## 1. Adicionar nova secao na sidebar de Motoristas

**Arquivo:** `src/pages/Motoristas.tsx`

Adicionar um terceiro item na sidebar:

```text
{ id: 'cadastro', label: 'Motoristas', icon: Users },
{ id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
{ id: 'escalas', label: 'Escalas', icon: CalendarDays },  // NOVO
```

E renderizar o novo componente no conteudo quando `activeSection === 'escalas'`.

## 2. Criar componente `EscalasAuditoria`

**Arquivo:** `src/components/motoristas/EscalasAuditoria.tsx` (NOVO)

### Interface

- No topo: `DiaSeletor` com navegacao dia a dia e toggle "Todos os dias"
- Abaixo: cards de cada escala ativa naquele dia, mostrando:
  - Nome da escala, cor, horario (inicio-fim)
  - Lista de motoristas vinculados (nome + status presenca)
  - Veiculo de cada motorista (via JOIN `motoristas.veiculo_id -> veiculos`)
  - Historico de vinculacao de veiculos durante a escala (via `veiculo_vistoria_historico`)

### Dados

O componente recebera como props:
- `eventoId`
- `evento` (para `data_inicio`, `data_fim`)

E fara queries internas para:

1. **Escalas do evento:** `escalas` filtradas por `evento_id` e `ativo = true`
2. **Motoristas das escalas:** `escala_motoristas` com JOIN nas `escalas`
3. **Presenca do dia selecionado:** `motorista_presenca` filtrada por `data = dataSelecionada`
4. **Veiculos vinculados:** consulta `veiculo_vistoria_historico` para o dia selecionado (vinculacao/desvinculacao)

### Filtragem por data

A filtragem por data sera baseada no `created_at` do `escala_motoristas`:
- Se `verTodosDias = false`: mostrar apenas motoristas cuja vinculacao (`created_at`) ocorreu no dia selecionado, mais escalas que ja existiam antes (permanentes)
- A abordagem mais simples e util: como escalas sao definicoes fixas (turno A, turno B), mostrar sempre todas as escalas ativas e filtrar a **presenca** pelo dia selecionado. Assim o usuario ve "neste dia, quem fez check-in em cada turno e com qual veiculo"

### Layout dos cards

```text
[DiaSeletor: < sex, 14 de fev >  | Todos]

+----------------------------------------+
| [cor] Turno A  (06:00 - 14:00)         |
| 3 motoristas                           |
|                                        |
| Joao Silva                             |
|   Van TYJ0H74 | Check-in 06:15        |
|   Check-out 14:05 (7h50)              |
|                                        |
| Maria Santos                           |
|   Onibus ABC1234 | Check-in 06:30      |
|   Sem check-out                        |
|                                        |
| Pedro Lima                             |
|   Sem veiculo | Sem presenca           |
+----------------------------------------+

+----------------------------------------+
| [cor] Turno B  (14:00 - 22:00)         |
| 2 motoristas                           |
| ...                                    |
+----------------------------------------+
```

### KPIs no topo (por dia)

- Total de motoristas escalados
- Motoristas com check-in
- Motoristas com check-out completo
- Horas totais trabalhadas

## 3. Exportar Excel

Botao para exportar a auditoria de escalas do dia selecionado (ou todos os dias) em formato Excel, incluindo:
- Escala, Motorista, Veiculo, Check-in, Check-out, Duracao

---

## Detalhes Tecnicos

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/motoristas/EscalasAuditoria.tsx` | **NOVO** - Componente de auditoria de escalas com DiaSeletor |
| `src/pages/Motoristas.tsx` | Adicionar secao 'escalas' na sidebar e renderizar EscalasAuditoria |

### Query de presenca por dia

```text
supabase
  .from('motorista_presenca')
  .select('*')
  .eq('evento_id', eventoId)
  .eq('data', dataSelecionada)
```

### Dados de veiculos

Reutilizar a prop `veiculos` ja disponivel na pagina Motoristas, e cruzar com `motoristas.veiculo_id` para mostrar o veiculo atual de cada motorista. Para historico intraday, consultar `veiculo_vistoria_historico` filtrando por `created_at` no dia selecionado.

### Integracao com DiaSeletor

Usar o componente `DiaSeletor` existente com as props:
- `dataOperacional`: data selecionada (default: hoje)
- `dataInicio/dataFim`: do evento
- `showToggleAll`: true
- `verTodosDias/onToggleTodosDias`: para alternar entre dia unico e todos

### Sem migracoes de banco

Todos os dados necessarios ja existem nas tabelas `escalas`, `escala_motoristas`, `motorista_presenca`, `motoristas`, `veiculos` e `veiculo_vistoria_historico`.

