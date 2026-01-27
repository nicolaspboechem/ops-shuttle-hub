
# Plano: Criação da Role "Cliente" - Dashboard Estratégico

## Resumo Executivo

Criar uma nova role "cliente" no sistema de evento_usuarios com uma interface dedicada focada em **análise estratégica de público e comportamento**. O cliente terá acesso condicional ao Dashboard, Localizador e Painel de Horários baseado nas configurações do evento no CCO.

---

## Análise da Arquitetura Atual

### Sistema de Roles Existente

| Role | Tabela | Interface | Acesso |
|------|--------|-----------|--------|
| `admin` | user_roles | CCO Desktop | Completo |
| `motorista` | evento_usuarios | App Mobile | Viagens próprias |
| `operador` | evento_usuarios | App Mobile | Gerenciar viagens |
| `supervisor` | evento_usuarios | App Mobile | Master de campo |

### Configurações de Evento (tabela `eventos`)
- `habilitar_localizador: boolean` - Controla visibilidade do painel localizador
- `visivel_publico: boolean` - Controla visibilidade do painel de horários

---

## Estrutura da Nova Role

### Role: `cliente`

**Características:**
- Armazenado em `evento_usuarios` com role = 'cliente'
- Acesso somente leitura (sem ações de criação/edição)
- Dashboard estratégico sem alertas operacionais
- Acesso condicional ao Localizador e Painel

### Abas Disponíveis

| Aba | Condição | Descrição |
|-----|----------|-----------|
| **Dashboard** | Sempre visível | Versão estratégica focada em métricas de público |
| **Localizador** | Se `habilitar_localizador = true` | Visualização do Kanban de motoristas |
| **Painel** | Se `visivel_publico = true` | Horários de rotas shuttle |

---

## Implementação

### Fase 1: Atualização do AuthContext

**Arquivo:** `src/lib/auth/AuthContext.tsx`

Adicionar 'cliente' ao tipo EventRole:

```typescript
type EventRole = 'motorista' | 'operador' | 'supervisor' | 'cliente';
```

### Fase 2: Criação dos Componentes de Layout

**Novos Arquivos:**

| Arquivo | Descrição |
|---------|-----------|
| `src/components/app/ClienteBottomNav.tsx` | Navegação inferior mobile (3 tabs) |
| `src/components/app/ClienteHeaderNav.tsx` | Header desktop com abas fixas |
| `src/components/app/ClienteDashboardTab.tsx` | Dashboard estratégico |
| `src/pages/app/AppCliente.tsx` | Página principal do cliente |

### Fase 3: ClienteBottomNav (Mobile)

Navegação inferior com 3 abas:

```text
┌──────────────────────────────────────────┐
│                                          │
│          [CONTEÚDO DA TAB]               │
│                                          │
├──────────────────────────────────────────┤
│  [📊]      [📍]      [🕐]               │
│ Dashboard  Local*    Painel*            │
│                                          │
│  * Exibido condicionalmente              │
└──────────────────────────────────────────┘
```

### Fase 4: ClienteHeaderNav (Desktop)

Header fixo com abas horizontais:

```text
┌──────────────────────────────────────────────────────────┐
│  🏢 AS Brasil │ Evento XYZ │ Dashboard │ Local* │ Painel*│
└──────────────────────────────────────────────────────────┘
```

### Fase 5: ClienteDashboardTab - Dashboard Estratégico

**Removido do Dashboard Original:**
- ❌ AlertsPanel (alertas e críticos)
- ❌ Top Motoristas
- ❌ Top Veículos
- ❌ Cards de Status (OK, Alerta, Crítico)

**Mantido/Expandido:**
- ✅ Métricas de PAX em tempo real
- ✅ Viagens por hora (gráfico)
- ✅ PAX por hora (gráfico)
- ✅ Desempenho por Rota
- ✅ Filtros por tipo de operação e ponto de embarque
- ✅ Indicadores de tempo médio

**Novas Métricas Estratégicas:**
- Total de PAX transportados no dia
- Pico de demanda (horário)
- Rota mais utilizada
- Ocupação média dos veículos

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/app/ClienteBottomNav.tsx` | Navegação mobile |
| `src/components/app/ClienteHeaderNav.tsx` | Header desktop |
| `src/components/app/ClienteDashboardTab.tsx` | Dashboard estratégico |
| `src/components/app/ClienteLocalizadorTab.tsx` | Wrapper do localizador |
| `src/components/app/ClientePainelTab.tsx` | Wrapper do painel de horários |
| `src/pages/app/AppCliente.tsx` | Página principal |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/lib/auth/AuthContext.tsx` | Adicionar 'cliente' ao EventRole |
| `src/App.tsx` | Adicionar rota `/app/:eventoId/cliente` |
| `src/pages/app/AppHome.tsx` | Redirecionar cliente para sua interface |

---

## Seção Técnica

### Estrutura do AppCliente

```typescript
// src/pages/app/AppCliente.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClienteBottomNav, ClienteTabId } from '@/components/app/ClienteBottomNav';
import { ClienteHeaderNav } from '@/components/app/ClienteHeaderNav';
import { ClienteDashboardTab } from '@/components/app/ClienteDashboardTab';
import { ClienteLocalizadorTab } from '@/components/app/ClienteLocalizadorTab';
import { ClientePainelTab } from '@/components/app/ClientePainelTab';

export default function AppCliente() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ClienteTabId>('dashboard');
  const [evento, setEvento] = useState<{
    nome_planilha: string;
    habilitar_localizador: boolean;
    visivel_publico: boolean;
  } | null>(null);

  useEffect(() => {
    // Fetch event settings
    supabase
      .from('eventos')
      .select('nome_planilha, habilitar_localizador, visivel_publico')
      .eq('id', eventoId)
      .single()
      .then(({ data }) => setEvento(data));
  }, [eventoId]);

  const tabs = useMemo(() => {
    const available: ClienteTabId[] = ['dashboard'];
    if (evento?.habilitar_localizador) available.push('localizador');
    if (evento?.visivel_publico) available.push('painel');
    return available;
  }, [evento]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ClienteDashboardTab eventoId={eventoId!} />;
      case 'localizador':
        return <ClienteLocalizadorTab eventoId={eventoId!} />;
      case 'painel':
        return <ClientePainelTab eventoId={eventoId!} />;
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen pb-16">
        <MobileHeader title={evento?.nome_planilha || 'Cliente'} />
        {renderContent()}
        <ClienteBottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          availableTabs={tabs}
        />
      </div>
    );
  }

  // Desktop
  return (
    <div className="min-h-screen">
      <ClienteHeaderNav 
        eventoNome={evento?.nome_planilha}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableTabs={tabs}
      />
      <main className="container mx-auto px-6 py-6">
        {renderContent()}
      </main>
    </div>
  );
}
```

### ClienteBottomNav

```typescript
export type ClienteTabId = 'dashboard' | 'localizador' | 'painel';

interface ClienteBottomNavProps {
  activeTab: ClienteTabId;
  onTabChange: (tab: ClienteTabId) => void;
  availableTabs: ClienteTabId[];
}

const allTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'localizador', label: 'Localizador', icon: MapPin },
  { id: 'painel', label: 'Painel', icon: Clock },
];

export function ClienteBottomNav({ activeTab, onTabChange, availableTabs }: ClienteBottomNavProps) {
  const visibleTabs = allTabs.filter(t => availableTabs.includes(t.id));
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around h-16">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

### ClienteHeaderNav (Desktop)

```typescript
export function ClienteHeaderNav({ 
  eventoNome, 
  activeTab, 
  onTabChange, 
  availableTabs 
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img src={logoAS} alt="AS Brasil" className="h-10" />
            <div>
              <h1 className="font-semibold">{eventoNome}</h1>
              <Badge variant="secondary">Cliente</Badge>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {availableTabs.map(tabId => (
              <Button
                key={tabId}
                variant={activeTab === tabId ? "default" : "ghost"}
                onClick={() => onTabChange(tabId)}
              >
                {tabId === 'dashboard' && <><BarChart3 className="mr-2" />Dashboard</>}
                {tabId === 'localizador' && <><MapPin className="mr-2" />Localizador</>}
                {tabId === 'painel' && <><Clock className="mr-2" />Painel</>}
              </Button>
            ))}
          </div>
          
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
```

### ClienteDashboardTab (Dashboard Estratégico)

Dashboard focado em análise de público, **sem elementos operacionais**:

```typescript
export function ClienteDashboardTab({ eventoId }: { eventoId: string }) {
  const { viagens } = useViagens(eventoId);
  const { kpis, metricasPorHora, viagensAtivas, viagensFinalizadas } = useCalculos(viagens);

  // Métricas estratégicas
  const totalPaxDia = useMemo(() => 
    viagens.reduce((acc, v) => acc + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0)
  , [viagens]);

  const horarioPico = useMemo(() => {
    if (!metricasPorHora.length) return null;
    return metricasPorHora.reduce((max, h) => h.pax > max.pax ? h : max);
  }, [metricasPorHora]);

  return (
    <div className="space-y-6">
      {/* Header com última atualização */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Análise Estratégica</h2>
        <Badge variant="outline">{format(new Date(), 'HH:mm:ss')}</Badge>
      </div>

      {/* KPIs Estratégicos - Sem alertas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total PAX Dia" 
          value={totalPaxDia} 
          icon={<Users />} 
        />
        <MetricCard 
          title="Viagens Realizadas" 
          value={viagensFinalizadas.length} 
          icon={<CheckCircle />} 
        />
        <MetricCard 
          title="Em Trânsito" 
          value={viagensAtivas.length} 
          icon={<Bus />} 
        />
        <MetricCard 
          title="Tempo Médio" 
          value={formatarMinutos(kpis?.tempoMedioGeral || 0)} 
          icon={<Clock />} 
        />
      </div>

      {/* Gráficos - Foco em comportamento */}
      <div className="grid md:grid-cols-2 gap-6">
        <PassengersChart data={metricasPorHora} />
        <RoutePerformanceChart viagens={viagens} />
      </div>

      {/* Insights */}
      {horarioPico && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Horário de Pico:</strong> {horarioPico.hora}h 
              com {horarioPico.pax} passageiros
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Rotas e Proteção

### Nova Rota no App.tsx

```typescript
// Adicionar após as rotas do supervisor
<Route path="/app/:eventoId/cliente" element={
  <EventRoleRoute allowedRoles={['cliente']}>
    <AppCliente />
  </EventRoleRoute>
} />
```

### Atualização do AppHome.tsx

Adicionar redirecionamento para clientes:

```typescript
// Em handleSelectEvento
if (role === 'cliente') {
  navigate(`/app/${evento.id}/cliente`);
}

// Em auto-redirect (single event)
if (role === 'cliente') {
  navigate(`/app/${evento.id}/cliente`);
  return;
}
```

---

## Fluxo Visual

### Desktop

```text
┌──────────────────────────────────────────────────────────────────┐
│  🏢 AS Brasil  │  Rio Open 2026  │  [Dashboard]  [Local]  [Painel] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐  ┌──────────────────┐                    │
│   │ Total PAX Dia    │  │ Viagens Realizadas│                    │
│   │      1,234       │  │        56         │                    │
│   └──────────────────┘  └──────────────────┘                    │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                 Gráfico PAX por Hora                     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Desempenho por Rota                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile

```text
┌─────────────────────────────┐
│  Rio Open 2026    [⚙️]      │
├─────────────────────────────┤
│                             │
│  ┌─────────┐ ┌─────────┐   │
│  │PAX Dia  │ │Viagens  │   │
│  │  1,234  │ │   56    │   │
│  └─────────┘ └─────────┘   │
│                             │
│  ┌─────────┐ ┌─────────┐   │
│  │Trânsito │ │Tempo Méd│   │
│  │    8    │ │  45min  │   │
│  └─────────┘ └─────────┘   │
│                             │
│  ┌───────────────────────┐ │
│  │ [Gráfico PAX/Hora]    │ │
│  └───────────────────────┘ │
│                             │
├─────────────────────────────┤
│  [📊]      [📍]     [🕐]   │
│ Dashboard  Local   Painel  │
└─────────────────────────────┘
```

---

## Resultado Esperado

| Funcionalidade | Descrição |
|----------------|-----------|
| ✅ Dashboard Estratégico | Métricas de público sem alertas operacionais |
| ✅ Localizador Condicional | Visível se `habilitar_localizador = true` |
| ✅ Painel Condicional | Visível se `visivel_publico = true` |
| ✅ Desktop com Header | Abas fixas no topo |
| ✅ Mobile com Bottom Nav | Navegação inferior |
| ✅ Sem impacto nas roles existentes | Sistema atual preservado |

---

## Próximos Passos (Pós-Implementação)

1. Criar usuários de teste com role 'cliente'
2. Vincular ao evento via `evento_usuarios`
3. Testar visibilidade condicional das tabs
4. Validar responsividade desktop/mobile
