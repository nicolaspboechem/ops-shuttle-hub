
# Plano: Modal de Detalhes de Veículo no CCO + Exibição de Nome no Localizador

## Objetivo

Implementar um modal de detalhes completo para veículos no painel CCO (similar ao modal de motoristas), exibindo:
- Resumo e dados cadastrais do veículo
- Histórico de uso (quem usou, quando, por quanto tempo)
- Histórico de avarias e vistorias
- Nome/apelido do veículo em destaque

Também atualizar o Localizador para exibir **Nome do Veículo + Placa** ao invés de apenas placa.

---

## Situação Atual

| Componente | Situação |
|------------|----------|
| Campo `nome` na tabela `veiculos` | Já existe no banco e no código |
| `VeiculoModal` (edição) | Já possui campo para nome/apelido |
| `LocalizadorVeiculoCard` | Já exibe nome quando existe (linha 48-56) |
| `LocalizadorCard` (motoristas) | Exibe nome do veículo se disponível |
| Modal de detalhes de veículo | **NÃO EXISTE** - precisa criar |

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/veiculos/VeiculoDetalheModal.tsx` | Modal completo de detalhes do veículo |

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/veiculos/VeiculoKanbanCardFull.tsx` | MODIFICAR | Adicionar onClick para abrir modal de detalhes |
| `src/components/veiculos/VeiculosListView.tsx` | MODIFICAR | Adicionar botão de detalhes na tabela |
| `src/components/veiculos/VeiculosAuditoria.tsx` | MODIFICAR | Adicionar botão de detalhes nos cards e tabela |
| `src/pages/Veiculos.tsx` | MODIFICAR | Integrar modal de detalhes |

---

## Estrutura do Modal de Detalhes

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🚐 Viatura 01 - ABC-1234                                    [X]        │
│  Van • Fornecedor ABC                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────┐│
│  │ 📊 24          │ │ 👥 156         │ │ 🔧 2 Avarias   │ │ ⛽ 3/4    ││
│  │ Viagens       │ │ PAX Total     │ │                │ │          ││
│  └────────────────┘ └────────────────┘ └────────────────┘ └───────────┘│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  [Resumo]  [Histórico de Uso]  [Vistorias]                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════════│
│                                                                         │
│  ABA: RESUMO                                                            │
│  ├─ Status: Liberado ✅                                                 │
│  ├─ Motorista Vinculado: João Silva                                     │
│  ├─ Capacidade: 15 lugares                                              │
│  ├─ KM: 45.230 → 47.890 (2.660 km)                                      │
│  ├─ Última Vistoria: 25/01/2026 às 08:30                               │
│  └─ Observações: Veículo em bom estado                                  │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════════│
│                                                                         │
│  ABA: HISTÓRICO DE USO                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Data       │ Motorista      │ Check-in │ Check-out │ Duração │ Obs ││
│  │────────────│────────────────│──────────│───────────│─────────│─────││
│  │ 25/01/2026 │ João Silva     │ 06:30    │ 18:45     │ 12h15   │     ││
│  │ 24/01/2026 │ Maria Santos   │ 07:00    │ 19:00     │ 12h     │  ⚠️ ││
│  │ 23/01/2026 │ João Silva     │ 06:15    │ 18:30     │ 12h15   │     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════════│
│                                                                         │
│  ABA: VISTORIAS                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 📋 Vistoria Inicial - 22/01/2026 08:30                             ││
│  │    Status: Liberado | Combustível: Cheio | KM: 45.230              ││
│  │    Realizado por: Admin                                            ││
│  │    ✅ Sem avarias                                                  ││
│  │    [Ver Fotos]                                                     ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ ⚠️ Re-vistoria - 24/01/2026 19:00                                 ││
│  │    Status: Pendente | Combustível: 1/2 | KM: 46.500                ││
│  │    Motorista: Maria Santos                                         ││
│  │    ❌ AVARIAS: Frente (arranhão no para-choque)                    ││
│  │    [Ver Fotos]                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Componente: VeiculoDetalheModal

### Dados exibidos

**Header:**
- Nome do veículo (destaque) + Placa
- Tipo de veículo + Fornecedor

**Cards de métricas:**
- Total de viagens
- Total de PAX transportados
- Quantidade de avarias registradas
- Nível de combustível atual

**Aba Resumo:**
- Status atual (Liberado/Pendente/Em Inspeção/Manutenção)
- Motorista vinculado (se houver)
- Capacidade
- KM inicial → KM final (diferença)
- Data da última vistoria
- Observações gerais

**Aba Histórico de Uso:**
- Tabela com registros de `motorista_presenca`
- Colunas: Data, Motorista, Check-in, Check-out, Duração, Observações
- Ícone de alerta se houver observação de checkout

**Aba Vistorias:**
- Lista de vistorias do `veiculo_vistoria_historico`
- Cards colapsáveis com detalhes de cada vistoria
- Indicador de avarias encontradas
- Botão para abrir `VistoriaDetalheModal` com fotos

---

## Hooks utilizados

| Hook | Uso |
|------|-----|
| `useVistoriaHistorico(veiculoId)` | Buscar histórico de vistorias |
| `useVeiculoPresencaHistorico` | Buscar histórico de uso (já filtra por veículo) |
| Novo: query inline para métricas de viagens | Contar viagens/PAX por placa |

---

## Integração nos Componentes

### VeiculoKanbanCardFull.tsx

Adicionar prop `onViewDetails` e tornar o card clicável:

```tsx
interface VeiculoKanbanCardFullProps {
  // ... props existentes
  onViewDetails?: (veiculoId: string) => void;
}

// No card, adicionar onClick ou botão "Ver detalhes"
<Button variant="ghost" size="sm" onClick={() => onViewDetails?.(veiculo.id)}>
  <Eye className="w-4 h-4 mr-1" />
  Detalhes
</Button>
```

### Veiculos.tsx

Adicionar state e handler para o modal:

```tsx
const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
const selectedVeiculo = veiculos.find(v => v.id === selectedVeiculoId);

// Render modal
<VeiculoDetalheModal
  veiculo={selectedVeiculo}
  open={!!selectedVeiculoId}
  onClose={() => setSelectedVeiculoId(null)}
  viagens={viagens}
  motoristas={motoristas}
  eventoId={eventoId}
/>
```

---

## Verificação do Localizador

O `LocalizadorVeiculoCard` já exibe nome + placa corretamente:

```tsx
// Linha 48-56 do LocalizadorVeiculoCard.tsx
<span className="font-bold text-lg text-foreground block truncate">
  {veiculo.nome || veiculo.placa}  // Prioriza nome
</span>
<span className="text-xs text-muted-foreground">
  {veiculo.nome ? veiculo.placa : ''}  // Mostra placa se nome existe
  {veiculo.nome && veiculo.tipo_veiculo && ' • '}
  {veiculo.tipo_veiculo}
</span>
```

Isso já está funcionando. Apenas garantir que o campo `nome` seja preenchido durante o cadastro.

---

## Seção Técnica

### Query para métricas de viagens por veículo

```typescript
const viagensDoVeiculo = viagens.filter(v => v.placa === veiculo.placa);
const totalViagens = viagensDoVeiculo.length;
const totalPax = viagensDoVeiculo.reduce((sum, v) => 
  sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
```

### Query para histórico de uso (presença)

```typescript
const { data: presencas } = await supabase
  .from('motorista_presenca')
  .select(`
    *,
    motorista:motoristas(nome, telefone)
  `)
  .eq('veiculo_id', veiculoId)
  .order('data', { ascending: false })
  .limit(50);
```

### Estrutura do hook useVistoriaHistorico (já existe)

O hook já busca o histórico completo com profile do realizador:

```typescript
const { data, error } = await supabase
  .from('veiculo_vistoria_historico')
  .select(`
    *,
    profile:profiles!realizado_por(full_name)
  `)
  .eq('veiculo_id', veiculoId)
  .order('created_at', { ascending: false });
```

---

## Ordem de Implementação

1. Criar `VeiculoDetalheModal.tsx` com as 3 abas
2. Integrar no `Veiculos.tsx` (página principal)
3. Adicionar botão "Detalhes" no `VeiculoKanbanCardFull.tsx`
4. Adicionar botão "Detalhes" na `VeiculosListView.tsx`
5. Adicionar botão "Detalhes" no `VeiculosAuditoria.tsx`

---

## Benefícios

- Visão completa do veículo em um único lugar
- Rastreabilidade de uso (quem usou, quando)
- Histórico de avarias com fotos
- Identificação visual rápida com nome/apelido
- Consistência com o padrão existente de detalhes de motorista
