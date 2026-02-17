

# Padronizar Tipos de Veiculo + Melhorar Filtros da Auditoria de Veiculos

## Parte 1: Adicionar todos os 5 tipos de veiculo em todo o sistema

O tipo `TipoVeiculo` ja esta definido como `'Van' | 'Onibus' | 'Sedan' | 'SUV' | 'Blindado'`, mas varios locais mostram apenas 2-4 opcoes.

### Arquivos a corrigir (adicionar tipos faltantes)

| Arquivo | Atual | Faltando |
|---|---|---|
| `FilterBar.tsx` (viagens) | Van, Onibus | Sedan, SUV, Blindado |
| `CreateViagemForm.tsx` (app) | Van, Onibus | Sedan, SUV, Blindado |
| `Motoristas.tsx` (filtro) | Van, Onibus | Sedan, SUV, Blindado |
| `CadastroModals.tsx` (schema zod) | Onibus, Van, Sedan, SUV | Blindado |
| `CadastroModals.tsx` (dropdown viagem) | Van, Onibus | Sedan, SUV, Blindado |
| `CreateVeiculoWizard.tsx` | Van, Onibus, Sedan, SUV | Blindado |
| `VeiculosAuditoria.tsx` (filtro) | Van, Onibus, Sedan, SUV | Blindado |
| `VeiculosUsoAuditoria.tsx` (filtro) | Van, Onibus, Sedan, SUV | Blindado |
| `MotoristasAuditoria.tsx` (filtro) | Van, Onibus, Sedan, SUV | Blindado |
| `VistoriaVeiculoWizard.tsx` | Van, Onibus, Sedan, SUV | Blindado |

### Detalhes tecnicos

Todos os dropdowns passarao a ter os 5 tipos:
- Van
- Onibus
- Sedan
- SUV
- Blindado

O schema zod em `CadastroModals.tsx` (linha 32) sera atualizado para `z.enum(['Onibus', 'Van', 'Sedan', 'SUV', 'Blindado'])`.

O cast do `onValueChange` em `CadastroModals.tsx` (linha 717) sera atualizado para incluir Blindado no type.

---

## Parte 2: Melhorar filtros da Auditoria de Veiculos

A aba de auditoria de veiculos (`VeiculosAuditoria.tsx`) atualmente tem apenas 4 filtros (Periodo Inicio, Periodo Fim, Tipo Veiculo, Fornecedor) sem busca por texto. Para encontrar informacoes rapidamente, as seguintes melhorias serao feitas:

### Novos filtros a adicionar

1. **Busca por texto** (placa, nome do veiculo ou motorista) -- campo de input com icone de lupa, posicionado acima dos filtros existentes para acesso rapido
2. **Filtro por Motorista** -- dropdown com lista dinamica dos motoristas vinculados (extraidos dos dados de veiculos cadastrados)
3. **Filtro por Status** (com/sem viagens, com/sem KM registrado) -- para identificar rapidamente veiculos ociosos ou sem registro de KM

### Layout dos filtros (apos alteracao)

Linha 1: Campo de busca por texto (largura total)
Linha 2: Periodo Inicio | Periodo Fim | Tipo Veiculo | Fornecedor | Motorista
Botao "Limpar filtros" quando houver filtro ativo

### Detalhes tecnicos

**Busca por texto**: Filtrar `metricasConsolidadas` por `placa`, `nome` ou `motorista` usando `.toLowerCase().includes(busca)`.

**Filtro por motorista**: Extrair lista unica de motoristas dos `veiculosCadastrados` (usando o join com a tabela motoristas que ja existe no componente). Comparar com `v.motorista`.

**Filtro por status de uso**: SelectItem com opcoes:
- Todos
- Com viagens (totalViagens > 0)
- Sem viagens (totalViagens === 0)
- Com KM (kmPercorrido > 0)
- Sem KM (kmPercorrido === 0)

Novos states a adicionar:
```typescript
const [busca, setBusca] = useState('');
const [filtroMotorista, setFiltroMotorista] = useState<string>('all');
const [filtroUso, setFiltroUso] = useState<string>('all');
```

A filtragem por busca e motorista sera aplicada no `metricasConsolidadas` useMemo, apos o calculo atual.

### Total de arquivos alterados: 10 arquivos

1. `src/components/viagens/FilterBar.tsx` -- +3 tipos
2. `src/components/app/CreateViagemForm.tsx` -- +3 tipos
3. `src/pages/Motoristas.tsx` -- +3 tipos
4. `src/components/cadastros/CadastroModals.tsx` -- schema + dropdown
5. `src/components/veiculos/CreateVeiculoWizard.tsx` -- +Blindado
6. `src/components/veiculos/VeiculosAuditoria.tsx` -- +Blindado + novos filtros (busca, motorista, status uso)
7. `src/components/veiculos/VeiculosUsoAuditoria.tsx` -- +Blindado
8. `src/components/motoristas/MotoristasAuditoria.tsx` -- +Blindado
9. `src/components/app/VistoriaVeiculoWizard.tsx` -- +Blindado
10. `src/components/dashboard/VehiclesChart.tsx` -- ja correto (nenhuma alteracao)

