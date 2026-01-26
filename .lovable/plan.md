
# Plano: Transformar App do Motorista em Hub com Menu Inferior Fixo

## Objetivo

Reestruturar a interface do motorista (`AppMotorista`) para funcionar como um **hub central** com navegação por abas fixas na parte inferior, oferecendo acesso fácil e intuitivo a:

- **Início**: Missões e viagens ativas (tela atual simplificada)
- **Veículo**: Dados do veículo, fotos, avarias, KM, registrar nova avaria
- **Nova Corrida**: Iniciar uma nova corrida rapidamente
- **Histórico**: Viagens finalizadas + botão de encerrar expediente

---

## Situação Atual

```text
┌──────────────────────────────────────┐
│  Header (Nome + Status + Evento)     │
├──────────────────────────────────────┤
│  CheckinCheckoutCard                 │
│  - Veículo atribuído                 │
│  - Botão Check-in / Check-out        │  ← Check-out visível
├──────────────────────────────────────┤
│  Missões Designadas                  │
│  - MissaoCardMobile                  │
├──────────────────────────────────────┤
│  Viagens Ativas                      │
│  - ViagemCardMobile                  │
├──────────────────────────────────────┤
│                                      │
│        [FAB +] Nova Viagem           │  ← FAB flutuante
│                                      │
└──────────────────────────────────────┘
```

**Problemas:**
- Tudo em uma única tela com scroll
- Acesso ao veículo limitado (só ver fotos)
- Não há histórico de viagens do dia
- Checkout muito visível (deveria ser secundário)

---

## Nova Arquitetura - Hub com Abas

```text
┌──────────────────────────────────────┐
│  Header (Nome + Status + Evento)     │
├──────────────────────────────────────┤
│                                      │
│         CONTEÚDO DA ABA              │
│                                      │
│  (varia conforme aba selecionada)    │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  🏠    🚗    ➕    📋    ⚙️         │  ← Menu inferior fixo
│ Início Veículo Corrida Histórico Mais│
└──────────────────────────────────────┘
```

### Abas Propostas

| Aba | Ícone | Descrição |
|-----|-------|-----------|
| **Início** | Home | Missões + Viagens ativas (hub principal) |
| **Veículo** | Car | Dados do veículo, fotos, avarias, registrar nova avaria |
| **Corrida** | Plus | Criar nova viagem (formulário) |
| **Histórico** | ClipboardList | Viagens finalizadas do dia + Encerrar Expediente |
| **Mais** | MoreHorizontal | Logout, configurações futuras |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/app/MotoristaBottomNav.tsx` | **CRIAR** | Menu inferior específico do motorista |
| `src/components/app/MotoristaVeiculoTab.tsx` | **CRIAR** | Aba de informações do veículo |
| `src/components/app/MotoristaHistoricoTab.tsx` | **CRIAR** | Aba de histórico + checkout |
| `src/pages/app/AppMotorista.tsx` | MODIFICAR | Integrar sistema de abas |
| `src/components/app/CheckinCheckoutCard.tsx` | MODIFICAR | Remover botão de checkout (mover para histórico) |

---

## Detalhes de Implementação

### 1. MotoristaBottomNav (Novo Componente)

Menu de navegação inferior estilo nativo:

```tsx
interface NavTab {
  id: 'inicio' | 'veiculo' | 'corrida' | 'historico' | 'mais';
  label: string;
  icon: LucideIcon;
}

const tabs: NavTab[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'veiculo', label: 'Veículo', icon: Car },
  { id: 'corrida', label: 'Corrida', icon: Plus },
  { id: 'historico', label: 'Histórico', icon: ClipboardList },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
];
```

Visual:
```text
┌─────────────────────────────────────────────────┐
│  🏠      🚗       ➕        📋       ⚙️        │
│ Início  Veículo  Corrida  Histórico  Mais      │
│  ───                                           │  ← indicador ativo
└─────────────────────────────────────────────────┘
```

---

### 2. MotoristaVeiculoTab (Novo Componente)

Aba dedicada ao veículo vinculado:

```text
┌─────────────────────────────────────┐
│  🚗 Meu Veículo                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  ABC-1234 • Van Prata         │  │
│  │  Tipo: Van • 15 lugares       │  │
│  │                               │  │
│  │  ⛽ Combustível: 3/4          │  │
│  │  📏 KM Inicial: 45.230        │  │
│  │  📅 Vistoria: 26/01 08:30     │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  📸 Fotos do Veículo (6)           │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │    │ │    │ │    │              │
│  └────┘ └────┘ └────┘              │
├─────────────────────────────────────┤
│  ⚠️ Avarias Registradas (2)        │
│  • Frente: Arranhão no para-choque │
│  • Interior: Banco rasgado         │
├─────────────────────────────────────┤
│  [📝 Registrar Nova Avaria]        │  ← Abre modal
└─────────────────────────────────────┘
```

**Funcionalidades:**
- Ver todas as fotos do veículo (já temos VeiculoFotosModal)
- Listar avarias existentes
- Botão para registrar nova avaria (abre modal com foto + descrição)

---

### 3. MotoristaHistoricoTab (Novo Componente)

Aba de histórico com checkout escondido:

```text
┌─────────────────────────────────────┐
│  📋 Histórico de Hoje              │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  ✅ SDU → Hotel Barra         │  │
│  │  09:30 - 10:15 • 45min        │  │
│  │  PAX: 8                       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  ✅ Hotel → Aeroporto         │  │
│  │  11:00 - 11:45 • 45min        │  │
│  │  PAX: 5                       │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  📊 Resumo do Dia                  │
│  • 2 viagens finalizadas           │
│  • Total PAX: 13                   │
│  • Tempo em rota: 1h30min          │
├─────────────────────────────────────┤
│  [🚪 Encerrar Expediente]          │  ← Botão secundário
└─────────────────────────────────────┘
```

**Funcionalidades:**
- Lista viagens encerradas do motorista (hoje)
- Resumo com estatísticas do dia
- Botão "Encerrar Expediente" (checkout) - posição secundária

---

### 4. AppMotorista (Modificações)

Transformar em controlador de abas:

```tsx
const [activeTab, setActiveTab] = useState<TabId>('inicio');

// Renderização condicional por aba
const renderTabContent = () => {
  switch (activeTab) {
    case 'inicio':
      return <InicioContent />;  // Missões + Viagens ativas
    case 'veiculo':
      return <MotoristaVeiculoTab veiculo={veiculoExibir} />;
    case 'corrida':
      return <CreateViagemMotoristaForm ... />;  // Direto no conteúdo
    case 'historico':
      return <MotoristaHistoricoTab ... />;
    case 'mais':
      return <MaisContent />;  // Logout, etc
  }
};
```

---

### 5. CheckinCheckoutCard (Modificações)

Remover botão de checkout da tela principal:

- Manter: Card de status (entrada/saída registradas)
- Manter: Botão de Check-in
- Remover: Botão "Encerrar Expediente"

O checkout será acessível apenas pela aba "Histórico".

---

## Fluxo de Uso Atualizado

1. **Motorista abre o app** → Aba "Início" ativa
   - Vê card de presença (check-in ou status)
   - Vê missões designadas
   - Vê viagens ativas

2. **Quer ver dados do veículo** → Toca em "Veículo"
   - Vê fotos, avarias, KM, combustível
   - Pode registrar nova avaria

3. **Quer iniciar nova corrida** → Toca em "Corrida"
   - Formulário de criação de viagem

4. **Quer ver histórico ou encerrar dia** → Toca em "Histórico"
   - Vê viagens finalizadas
   - Resumo do dia
   - Botão de checkout (secundário)

5. **Quer sair** → Toca em "Mais"
   - Opção de logout

---

## Estados Especiais

### Sem Veículo Atribuído (Aba Veículo)
```text
┌─────────────────────────────────────┐
│  🚗 Meu Veículo                     │
├─────────────────────────────────────┤
│                                     │
│       🚗 (ícone grande opaco)       │
│                                     │
│   Nenhum veículo atribuído          │
│   Aguarde a atribuição pela         │
│   coordenação                       │
│                                     │
└─────────────────────────────────────┘
```

### Sem Check-in (Aba Início)
- CheckinCheckoutCard exibe botão de check-in
- Outras funcionalidades podem ser limitadas

---

## Benefícios

1. **Navegação clara**: Menu fixo sempre visível
2. **Acesso rápido ao veículo**: Aba dedicada com todas as informações
3. **Checkout escondido**: Evita cliques acidentais, ação secundária
4. **Histórico acessível**: Motorista pode ver suas viagens do dia
5. **UX nativa**: Padrão de navegação familiar (apps mobile)
6. **Escalável**: Fácil adicionar novas abas no futuro

---

## Detalhes Técnicos

### Estado Compartilhado
O `AppMotorista` mantém o estado centralizado e passa props para as abas:
- `veiculoExibir`: Veículo vinculado (do check-in ou atribuído)
- `presenca`: Dados de presença do dia
- `minhasViagensAtivas`: Viagens em andamento
- `minhasViagensFinalizadas`: Viagens encerradas (novo cálculo)
- `minhasMissoes`: Missões designadas

### Viagens Finalizadas (Novo filtro)
```tsx
const minhasViagensFinalizadas = useMemo(() => {
  if (!motoristaData) return [];
  return viagens
    .filter(v => 
      v.motorista_id === motoristaData.id && 
      (v.status === 'encerrado' || v.status === 'cancelado')
    )
    .sort((a, b) => {
      // Ordenar por hora de chegada (mais recente primeiro)
      return (b.h_chegada || '').localeCompare(a.h_chegada || '');
    });
}, [viagens, motoristaData]);
```

### Registrar Avaria (Nova funcionalidade)
Modal simples para registrar avaria durante o expediente:
- Seleção de área do veículo
- Descrição do problema
- Foto opcional (usando câmera do dispositivo)
- Salva em `veiculo_fotos` e atualiza `inspecao_dados`
