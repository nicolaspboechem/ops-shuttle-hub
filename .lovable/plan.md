
# Plano: Melhorias na Interface Supervisor + Pull to Refresh Global

## Resumo

Este plano aborda 4 melhorias solicitadas:

1. **Filtros nas abas Motoristas e Veiculos** - Adicionar cards clicaveis de status como filtros (igual SupervisorViagensTab)
2. **Remover opcoes do menu "Mais"** - Retirar itens que supervisor nao tem acesso
3. **Aba Localizador com filtros** - Substituir Kanban horizontal por layout vertical com filtros igual Frota/Viagens
4. **Pull to Refresh em todos os apps** - Adicionar gesto de puxar para atualizar em todos os aplicativos mobile

---

## Arquitetura Atual vs Proposta

```text
ANTES                                   DEPOIS
-------------------------------------------------
SupervisorFrotaTab                      SupervisorFrotaTab
  - Cards de stats (apenas exibicao)      - Cards de stats CLICAVEIS (filtros)
  - Busca texto                           - Busca texto
  - Lista sem filtro de status            - Lista filtrada por status

SupervisorLocalizadorTab                SupervisorLocalizadorTab  
  - Kanban horizontal scroll              - Cards de stats como filtros
  - Sem filtros                           - Busca texto
  - Colunas por localizacao               - Lista vertical agrupada

SupervisorMaisTab                       SupervisorMaisTab
  - Equipe do Evento (navega CCO)         - REMOVER Equipe do Evento
  - Auditoria (navega CCO)                - REMOVER Auditoria
  - Conta (trocar evento)                 - Manter Conta

AppCliente                              AppCliente
  - Sem Pull to Refresh                   - COM Pull to Refresh

AppSupervisor                           AppSupervisor
  - Sem Pull to Refresh                   - COM Pull to Refresh
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/app/SupervisorFrotaTab.tsx` | Tornar cards de stats clicaveis como filtros |
| `src/components/app/SupervisorLocalizadorTab.tsx` | Redesenhar com filtros e lista vertical |
| `src/components/app/SupervisorMaisTab.tsx` | Remover opcoes de Equipe e Auditoria |
| `src/pages/app/AppSupervisor.tsx` | Envolver conteudo em PullToRefresh |
| `src/pages/app/AppCliente.tsx` | Adicionar PullToRefresh |

---

## Secao Tecnica

### 1. SupervisorFrotaTab - Filtros por Status

**Estado atual:** Cards de stats apenas exibem numeros
**Proposto:** Cards clicaveis que filtram a lista

```typescript
// Novo state para filtro
const [motoristaFilter, setMotoristaFilter] = useState<string | null>(null);
const [veiculoFilter, setVeiculoFilter] = useState<string | null>(null);

// Cards clicaveis (exemplo motoristas)
<Card 
  className={cn(
    "cursor-pointer transition-all active:scale-95",
    motoristaFilter === 'disponivel' 
      ? "ring-2 ring-emerald-500" 
      : "border-emerald-500/30"
  )}
  onClick={() => setMotoristaFilter(prev => 
    prev === 'disponivel' ? null : 'disponivel'
  )}
>
  ...
</Card>

// Filtrar lista baseado no estado
const displayedMotoristas = motoristaFilter 
  ? filteredMotoristas.filter(m => {
      if (motoristaFilter === 'disponivel') return m.status === 'disponivel';
      if (motoristaFilter === 'em_viagem') return m.status === 'em_viagem';
      if (motoristaFilter === 'sem_veiculo') return !m.veiculo;
      return true;
    })
  : filteredMotoristas;
```

### 2. SupervisorLocalizadorTab - Novo Layout

**Estado atual:** Kanban horizontal com scroll lateral
**Proposto:** Layout vertical com:
- Cards de stats clicaveis como filtros (Em Transito, Base, Sem Local)
- Campo de busca
- Lista agrupada por localizacao (colapsavel opcionalmente)

```typescript
// Novo design
<div className="space-y-4">
  {/* Stats filter - igual ao Viagens */}
  <div className="grid grid-cols-3 gap-2">
    <Card onClick={() => setFilter('em_transito')} ...>
      Em Transito ({count})
    </Card>
    <Card onClick={() => setFilter('base')} ...>
      Base ({count})
    </Card>
    <Card onClick={() => setFilter('outros')} ...>
      Outros ({count})
    </Card>
  </div>

  {/* Busca */}
  <Input placeholder="Buscar motorista..." />

  {/* Lista agrupada vertical */}
  {Object.entries(filteredByGroup).map(([loc, mots]) => (
    <div key={loc}>
      <h3>{loc} ({mots.length})</h3>
      {mots.map(m => <LocalizadorCard />)}
    </div>
  ))}
</div>
```

### 3. SupervisorMaisTab - Remover Opcoes

Remover blocos que direcionam para rotas do CCO:
- **Equipe do Evento** - redireciona para `/evento/${eventoId}/equipe` (CCO)
- **Auditoria** - redireciona para `/evento/${eventoId}/viagens-finalizadas` (CCO)

Manter apenas:
- Perfil do Supervisor
- Cadastros Rapidos (Motorista, Veiculo, KM)
- Conta (Trocar Evento)
- Logout

### 4. Pull to Refresh - Implementacao Global

**AppSupervisor:**
```typescript
// Adicionar estado e handler
const handleRefresh = async () => {
  await Promise.all([
    refetchViagens(),
    // outros refetches conforme aba ativa
  ]);
};

// Envolver main em PullToRefresh
<PullToRefresh onRefresh={handleRefresh}>
  <main className="container mx-auto px-4 py-4">
    {renderTabContent()}
  </main>
</PullToRefresh>
```

**AppCliente:**
```typescript
// Importar PullToRefresh
import { PullToRefresh } from '@/components/app/PullToRefresh';

// Adicionar handler
const handleRefresh = async () => {
  // Refetch baseado na aba ativa
};

// Envolver conteudo mobile
<PullToRefresh onRefresh={handleRefresh}>
  <main className="flex-1 overflow-auto">
    {renderContent()}
  </main>
</PullToRefresh>
```

---

## Resultado Visual

### SupervisorFrotaTab - Motoristas
```text
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Disp.   │ │Em Viagem│ │Sem Veic.│  <- Cards CLICAVEIS
│   12    │ │    5    │ │    3    │
└─────────┘ └─────────┘ └─────────┘
                 ↓ clicado = filtrado

[🔍 Buscar motorista...]

┌──────────────────────────────────┐
│ 🚗 Motorista A  │ Em Viagem      │
│ Placa ABC-1234                   │
└──────────────────────────────────┘
```

### SupervisorLocalizadorTab - Novo
```text
┌─────────┐ ┌─────────┐ ┌─────────┐
│Transito │ │  Base   │ │ Outros  │  <- Filtros
│    3    │ │   15    │ │    7    │
└─────────┘ └─────────┘ └─────────┘

[🔍 Buscar motorista...]

📍 EM TRANSITO (3)
┌──────────────────────────────────┐
│ João → Aeroporto → Hotel         │
└──────────────────────────────────┘

🏠 BASE (15)
┌──────────────────────────────────┐
│ Maria - Disponivel               │
└──────────────────────────────────┘
```

### SupervisorMaisTab - Simplificado
```text
┌──────────────────────────────────┐
│ 🛡️ Supervisor Operacional        │
│ Usuario: Nome                    │
│ Evento: Evento X                 │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ⚙️ Cadastros Rapidos             │
│ > Cadastrar Motorista            │
│ > Cadastrar Veiculo              │
│ > Registrar KM                   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Conta                            │
│ > Trocar Evento                  │
└──────────────────────────────────┘

[🚪 Sair do Sistema]
```

---

## Fluxo de Pull to Refresh

```text
Usuario puxa tela para baixo
         │
         ▼
┌─────────────────────────────────┐
│ Indicador de refresh aparece    │
│ (spinner girando)               │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Chama refetch() dos hooks       │
│ da aba ativa                    │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Dados atualizados               │
│ Indicador desaparece            │
└─────────────────────────────────┘
```

---

## Ordem de Implementacao

1. **SupervisorFrotaTab** - Adicionar filtros nos cards de stats
2. **SupervisorLocalizadorTab** - Redesenhar com novo layout
3. **SupervisorMaisTab** - Remover opcoes de CCO
4. **AppSupervisor** - Adicionar PullToRefresh
5. **AppCliente** - Adicionar PullToRefresh

