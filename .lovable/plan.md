
# Plano: Redesign do App Supervisor - Foco em Motoristas e Veículos

## Resumo Executivo

O App Supervisor será a **interface master de campo** com foco primário em **Motoristas** e **Veículos**, mantendo acesso secundário a operadores e viagens. A navegação será organizada por prioridade operacional.

---

## Estrutura de Navegação (5 Tabs)

```text
SupervisorBottomNav - Ordenado por Prioridade
│
├── 🚗 Frota (Tab Principal)
│   ├── Sub-tab "Motoristas" - Localização + Status + Vincular Veículo
│   └── Sub-tab "Veículos" - Kanban por status + Re-vistoria
│
├── 🚌 Viagens
│   ├── Lista completa de viagens ativas
│   ├── Iniciar/Finalizar/Retorno (como Operador)
│   └── Botão de Edição (exclusivo Supervisor)
│
├── ➕ Nova (Botão Central Destacado)
│   └── Criar viagem rápida
│
├── 📍 Localizador
│   ├── Mapa Kanban de localização
│   ├── Motoristas por ponto
│   └── Edição manual de localização
│
└── ⚙️ Mais
    ├── Cadastrar Motorista
    ├── Cadastrar Veículo
    ├── Ver Operadores do Evento
    ├── Registrar KM
    ├── Histórico/Auditoria
    └── Sair
```

---

## Comparativo de Prioridades

| Funcionalidade | Operador | Supervisor |
|----------------|----------|------------|
| **Gestão de Motoristas** | Lista simples | **Tab dedicada + Localização + Vinculação** |
| **Gestão de Veículos** | Não tem | **Tab dedicada + Kanban + Re-vistoria** |
| **Viagens** | Tab principal | Tab secundária |
| **Edição de Viagem** | Não | **Sim** |
| **Localizador** | Não | **Tab dedicada** |
| **Operadores** | Não | Aba "Mais" |

---

## Detalhamento das Tabs

### Tab 1: Frota (Principal)

A primeira tab que o Supervisor vê ao abrir o app.

**Sub-tab Motoristas:**
- Cards de motoristas com status em tempo real
- Veículo vinculado visível
- Última localização
- **Ações por swipe/menu:**
  - Editar localização
  - Vincular/desvincular veículo
  - Ver detalhes

**Sub-tab Veículos:**
- Kanban por status (aproveitando layout atual)
- Cards agrupados: Pendentes > Em Inspeção > Liberados > Manutenção
- **Ações por swipe/menu:**
  - Liberar/Marcar Pendente
  - Re-vistoriar
  - Ver histórico de vistorias

### Tab 2: Viagens

Similar ao Operador, mas com **poder de edição**.

- Cards de viagem com status
- Ações: Iniciar, Chegou, Retorno, Encerrar
- **NOVO:** Botão de edição (lápis) em cada card
- Modal de edição completo:
  - Trocar motorista
  - Trocar veículo
  - Alterar pontos
  - Alterar horários
  - Alterar PAX
  - Alterar status

### Tab 3: Nova (Central)

Botão destacado para criar viagem rapidamente.

- Abre o formulário de criação inline
- Auto-preenche veículo ao selecionar motorista
- Viagem inicia automaticamente

### Tab 4: Localizador

Visualização Kanban de localização dos motoristas.

- Scroll horizontal por colunas
- Cada coluna = um ponto de embarque
- Coluna especial "Em Trânsito" com rota ativa
- **Toque no card:** Abre modal para editar localização manualmente

### Tab 5: Mais

Acesso a funcionalidades administrativas.

```text
Cadastros
├── Cadastrar Motorista (wizard)
├── Cadastrar Veículo (wizard com vistoria)
└── Registrar KM

Equipe
└── Ver Operadores do Evento

Auditoria
├── Histórico de Viagens do Dia
└── Histórico de Vistorias

Conta
├── Trocar Evento
└── Sair
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `SupervisorBottomNav.tsx` | Barra de navegação com 5 tabs |
| `SupervisorFrotaTab.tsx` | Tab principal com sub-tabs Motoristas/Veículos |
| `SupervisorViagensTab.tsx` | Lista de viagens com edição |
| `SupervisorLocalizadorTab.tsx` | Kanban de localização mobile |
| `SupervisorMaisTab.tsx` | Cadastros + Equipe + Auditoria |
| `EditViagemMobileModal.tsx` | Modal de edição completo para mobile |
| `SupervisorMotoristaCard.tsx` | Card de motorista com ações |

## Arquivo a Refatorar

| Arquivo | Mudanças |
|---------|----------|
| `AppSupervisor.tsx` | Reestruturar para navegação por tabs |

---

## Seção Técnica

### SupervisorBottomNav

```typescript
export type SupervisorTabId = 'frota' | 'viagens' | 'nova' | 'localizador' | 'mais';

const tabs: NavTab[] = [
  { id: 'frota', label: 'Frota', icon: Car },      // Principal - Motoristas + Veículos
  { id: 'viagens', label: 'Viagens', icon: Bus },  // Secundário
  { id: 'nova', label: 'Nova', icon: Plus },       // Ação central
  { id: 'localizador', label: 'Local', icon: MapPin },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
];
```

### SupervisorFrotaTab (com sub-tabs)

```typescript
export function SupervisorFrotaTab({ eventoId }: Props) {
  const [subTab, setSubTab] = useState<'motoristas' | 'veiculos'>('motoristas');
  
  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex bg-muted rounded-lg p-1">
        <button 
          onClick={() => setSubTab('motoristas')}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition",
            subTab === 'motoristas' && "bg-background shadow"
          )}
        >
          <Users className="h-4 w-4 inline mr-1" /> Motoristas
        </button>
        <button 
          onClick={() => setSubTab('veiculos')}
          className={cn(
            "flex-1 py-2 rounded-md text-sm font-medium transition",
            subTab === 'veiculos' && "bg-background shadow"
          )}
        >
          <Car className="h-4 w-4 inline mr-1" /> Veículos
        </button>
      </div>
      
      {/* Conteúdo */}
      {subTab === 'motoristas' ? (
        <SupervisorMotoristasSubTab eventoId={eventoId} />
      ) : (
        <SupervisorVeiculosSubTab eventoId={eventoId} />
      )}
    </div>
  );
}
```

### Card de Motorista com Ações

```typescript
// SupervisorMotoristaCard.tsx
<SwipeableCard
  leftAction={{
    icon: <MapPin />,
    label: 'Local',
    bgColor: 'bg-blue-600',
    action: () => onEditLocation(motorista),
  }}
  rightAction={{
    icon: <Link2 />,
    label: 'Vincular',
    bgColor: 'bg-emerald-600',
    action: () => onLinkVehicle(motorista),
  }}
>
  {/* Card content */}
</SwipeableCard>
```

### EditViagemMobileModal (Edição Completa)

```typescript
interface EditViagemMobileModalProps {
  viagem: Viagem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onSave: () => void;
}

// Campos editáveis:
// - Motorista (Combobox)
// - Veículo (Combobox)
// - Ponto Embarque (Combobox)
// - Ponto Desembarque (Combobox)
// - Horário Pickup
// - Horário Chegada
// - PAX Ida / PAX Retorno
// - Status (agendado/em_andamento/aguardando_retorno/encerrado)
// - Observação
```

### Estrutura do AppSupervisor Refatorado

```typescript
export default function AppSupervisor() {
  const [activeTab, setActiveTab] = useState<SupervisorTabId>('frota'); // Frota é o default
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'frota':
        return <SupervisorFrotaTab eventoId={eventoId!} />;
      case 'viagens':
        return <SupervisorViagensTab eventoId={eventoId!} onRefresh={refetch} />;
      case 'nova':
        return (
          <CreateViagemForm
            open={true}
            embedded
            eventoId={eventoId!}
            onCreated={() => {
              refetch();
              setActiveTab('viagens');
            }}
          />
        );
      case 'localizador':
        return <SupervisorLocalizadorTab eventoId={eventoId!} />;
      case 'mais':
        return <SupervisorMaisTab eventoId={eventoId!} onLogout={signOut} />;
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4">
        {renderTabContent()}
      </main>
      <SupervisorBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
```

---

## Fluxo Visual

```text
┌─────────────────────────────────────────┐
│  🏢 Supervisor - Evento XYZ             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [Motoristas] │ [Veículos]       │   │  ← Sub-tabs
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 Disponíveis: 8               │   │
│  │ 🔵 Em Viagem: 3                 │   │
│  │ ⚠️ Sem Veículo: 2               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─ Card Motorista ─────────────────┐   │
│  │ 👤 João Silva                    │   │
│  │ 🚗 Van ABC-1234                  │   │
│  │ 📍 Sheraton                      │   │
│  │ ← [Localização] [Veículo] →      │   │  ← Swipe actions
│  └───────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [🚗]   [🚌]   [➕]   [📍]   [⚙️]      │  ← Bottom Nav
│  Frota Viagens Nova  Local  Mais       │
└─────────────────────────────────────────┘
```

---

## Resultado Esperado

Após implementação:

| Prioridade | Funcionalidade | Status |
|------------|----------------|--------|
| 🥇 Alta | Gestão de Motoristas (Tab Frota) | Nova |
| 🥇 Alta | Gestão de Veículos (Tab Frota) | Expandida |
| 🥈 Média | Viagens com Edição | Nova |
| 🥈 Média | Localizador de Motoristas | Nova |
| 🥉 Baixa | Ver Operadores | Nova (em "Mais") |
| 🥉 Baixa | Auditoria/Histórico | Nova (em "Mais") |

**Diferencial do Supervisor:**
1. ✅ Tab inicial é **Frota** (motoristas + veículos)
2. ✅ Pode **editar viagens** em campo
3. ✅ Pode **editar localização** de motoristas
4. ✅ Pode **vincular veículos** a motoristas
5. ✅ Pode **re-vistoriar** veículos
6. ✅ Acesso a **operadores** do evento
