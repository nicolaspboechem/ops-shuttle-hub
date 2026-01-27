
# Plano: Redesign do App Operador com Barra Inferior e UX Aprimorada

## Resumo Executivo

O App Operador (`/app/:eventoId/operador`) atualmente é funcional mas possui UX inferior comparado ao App Motorista. Este plano foca em:

1. **Autenticação unificada** - Operador já usa Supabase Auth (mesmo login do Admin) ✅
2. **Funcionalidades existentes** - Iniciar, finalizar, marcar retorno de shuttles ✅
3. **Melhoria visual** - Adicionar barra inferior com ações rápidas (como o Motorista)
4. **Consistência de UI** - Padronizar header, layout e feedback

---

## Análise da Situação Atual

### O que já funciona corretamente:

| Funcionalidade | Status | Observação |
|----------------|--------|------------|
| Login via `/auth` (Supabase Auth) | ✅ OK | Operadores usam email/senha |
| Iniciar corridas | ✅ OK | `iniciarViagem()` funciona |
| Finalizar corridas | ✅ OK | `registrarChegada()` funciona |
| Finalizar shuttle com retorno | ✅ OK | `iniciarRetorno()` funciona |
| Pull-to-refresh | ✅ OK | Atualização por gesto |
| FAB para nova viagem | ⚠️ Subótimo | Fica no canto, esconde conteúdo |

### Problemas de UX identificados:

| Problema | Impacto | Prioridade |
|----------|---------|------------|
| Sem barra inferior fixa | Alto - navegação difícil | Alta |
| FAB no canto inferior direito | Médio - esconde conteúdo | Média |
| Confirm nativo para cancelar | Médio - quebra design | Média |
| Sem indicador de status de conexão | Baixo | Baixa |
| Header sem status do operador | Baixo | Baixa |

---

## Plano de Implementação

### Fase 1: Criar Barra Inferior para Operador

**Novo componente: `OperadorBottomNav.tsx`**

Abas propostas (5 tabs como o Motorista):

| Tab | Ícone | Função |
|-----|-------|--------|
| **Viagens** | Bus | Lista de viagens ativas/finalizadas |
| **Motoristas** | Users | Status dos motoristas do evento |
| **Nova** | Plus (botão central destacado) | Criar nova viagem |
| **Histórico** | ClipboardList | Viagens finalizadas do dia |
| **Mais** | MoreHorizontal | Cadastros rápidos, KM, logout |

### Fase 2: Refatorar AppOperador para Navegação por Tabs

**Estrutura proposta:**

```text
AppOperador.tsx (refatorado)
├── Header (simplificado)
│   ├── Logo AS Brasil
│   ├── Nome do Evento
│   └── Indicador de Conexão
│
├── Tab Content (renderizado dinamicamente)
│   ├── Tab "viagens": Lista filtrada + status cards
│   ├── Tab "motoristas": Cards dos motoristas do evento
│   ├── Tab "nova": Formulário de criação inline
│   ├── Tab "historico": Viagens encerradas do dia
│   └── Tab "mais": Ações e configurações
│
└── OperadorBottomNav (fixo)
    └── 5 tabs com ação central destacada
```

### Fase 3: Melhorias de UI/UX

1. **Substituir `confirm()` por AlertDialog**
   - Usar componente shadcn/ui para consistência

2. **Mover formulário de criação para tab dedicada**
   - Eliminar FAB
   - Experiência mais fluida

3. **Adicionar Empty States bonitos**
   - Quando não há viagens
   - Quando não há motoristas

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/app/OperadorBottomNav.tsx` | **CRIAR** | Barra de navegação inferior (similar ao MotoristaBottomNav) |
| `src/pages/app/AppOperador.tsx` | **REFATORAR** | Implementar navegação por tabs, remover FAB |
| `src/components/app/ViagemCardOperador.tsx` | **MODIFICAR** | Substituir confirm() por AlertDialog |
| `src/components/app/OperadorMotoristasTab.tsx` | **CRIAR** | Tab para ver motoristas do evento |
| `src/components/app/OperadorHistoricoTab.tsx` | **CRIAR** | Tab para histórico de viagens |

---

## Seção Técnica

### Componente OperadorBottomNav

```typescript
// src/components/app/OperadorBottomNav.tsx
import { Bus, Users, Plus, ClipboardList, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OperadorTabId = 'viagens' | 'motoristas' | 'nova' | 'historico' | 'mais';

interface NavTab {
  id: OperadorTabId;
  label: string;
  icon: React.ElementType;
}

const tabs: NavTab[] = [
  { id: 'viagens', label: 'Viagens', icon: Bus },
  { id: 'motoristas', label: 'Motoristas', icon: Users },
  { id: 'nova', label: 'Nova', icon: Plus },
  { id: 'historico', label: 'Histórico', icon: ClipboardList },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
];

interface OperadorBottomNavProps {
  activeTab: OperadorTabId;
  onTabChange: (tab: OperadorTabId) => void;
}

export function OperadorBottomNav({ activeTab, onTabChange }: OperadorBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          // Botão central destacado para "Nova"
          if (tab.id === 'nova') {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/90 text-primary-foreground"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

### Refatoração do AppOperador

Estrutura principal com tabs:

```typescript
// AppOperador.tsx (estrutura)
const [activeTab, setActiveTab] = useState<OperadorTabId>('viagens');

const renderTabContent = () => {
  switch (activeTab) {
    case 'viagens':
      return (
        <div className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-2">...</div>
          
          {/* Lista de viagens */}
          <div className="space-y-3">
            {sortedViagens.map(viagem => (
              <ViagemCardOperador key={viagem.id} viagem={viagem} onUpdate={refetch} />
            ))}
          </div>
        </div>
      );

    case 'motoristas':
      return <OperadorMotoristasTab eventoId={eventoId!} />;

    case 'nova':
      return (
        <CreateViagemForm
          open={true}
          embedded // Prop para renderizar inline
          eventoId={eventoId!}
          onCreated={() => {
            refetch();
            setActiveTab('viagens');
          }}
        />
      );

    case 'historico':
      return <OperadorHistoricoTab viagensFinalizadas={viagensEncerradas} />;

    case 'mais':
      return (
        <div className="space-y-4">
          <Button onClick={() => setShowMotoristaForm(true)}>
            <User className="h-4 w-4 mr-2" /> Cadastrar Motorista
          </Button>
          <Button onClick={() => setShowVeiculoForm(true)}>
            <Car className="h-4 w-4 mr-2" /> Cadastrar Veículo
          </Button>
          <Button onClick={() => setShowKmModal(true)}>
            <Gauge className="h-4 w-4 mr-2" /> Registrar KM
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      );
  }
};
```

### AlertDialog para Cancelamento

Substituir `confirm()` em `ViagemCardOperador.tsx`:

```typescript
// Adicionar estado
const [showCancelDialog, setShowCancelDialog] = useState(false);

// Handler
const handleCancelar = async () => {
  setShowCancelDialog(true);
};

const confirmCancelar = async () => {
  setShowCancelDialog(false);
  setLoading(true);
  await cancelarViagem(viagem);
  onUpdate();
  setLoading(false);
};

// JSX
<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancelar viagem?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. A viagem será marcada como cancelada.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Voltar</AlertDialogCancel>
      <AlertDialogAction onClick={confirmCancelar} className="bg-destructive">
        Cancelar Viagem
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Comparativo Visual

### Antes (AppOperador atual)
- Header com menu dropdown
- Lista de viagens com filtros
- FAB no canto inferior direito
- Sem navegação inferior

### Depois (AppOperador redesenhado)
- Header simplificado com indicador de status
- Navegação por tabs na barra inferior
- Botão central destacado para criar viagem
- Experiência consistente com AppMotorista

---

## Resultado Esperado

1. ✅ Interface mais bonita e moderna
2. ✅ Navegação por barra inferior (5 abas)
3. ✅ Botão central destacado para nova viagem
4. ✅ Aba dedicada para ver motoristas do evento
5. ✅ Aba de histórico com viagens finalizadas
6. ✅ Aba "Mais" com ações administrativas
7. ✅ Consistência visual com o App Motorista
8. ✅ AlertDialog substituindo confirm() nativo
