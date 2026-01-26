
# Plano: Simplificar Painel Localizador - Foco em Motoristas por Localização

## Objetivo

Refatorar o Painel Localizador de Frota para exibir apenas motoristas (sem toggle veículos), organizados em colunas por localização. Cada card mostra o motorista como informação principal, com veículo e status como informações secundárias.

---

## Situação Atual

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Header: Logo + Toggle [Motoristas | Veículos] + Stats + Relógio   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Base     │  │ Hotel X  │  │ Aeroporto│  │EM TRÂNS. │            │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤            │
│  │ Card 1   │  │ Card 1   │  │ Card 1   │  │ Card 1   │            │
│  │ Card 2   │  │          │  │          │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Problemas:**
- Toggle entre motoristas/veículos adiciona complexidade desnecessária
- Informações do veículo são vinculadas ao motorista, então a visão de veículos é redundante
- Foco deve ser no motorista (quem está onde)

---

## Nova Arquitetura - Apenas Motoristas

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Header: Logo + Título + Stats (Simplificado) + Relógio            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │📍 Base   │  │📍 Hotel X│  │📍 Aero.  │  │🔄 TRÂNS. │  │❓ S/L │ │
│  │   (5)    │  │   (2)    │  │   (1)    │  │   (3)    │  │  (1)  │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├───────┤ │
│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │       │ │
│  ││ João   ││  ││ Pedro  ││  ││ Carlos ││  ││ Maria  ││  │       │ │
│  ││🚗 ABC12││  ││🚐 XYZ34││  ││🚌 MNO56││  ││→ Destino│  │       │ │
│  ││🟢 Disp.││  ││🟢 Disp.││  ││🟢 Disp.││  ││🔵 Em Via│  │       │ │
│  │└────────┘│  │└────────┘│  │└────────┘│  │└────────┘│  │       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/PainelLocalizador.tsx` | MODIFICAR | Remover toggle e lógica de veículos |
| `src/components/localizador/LocalizadorColumn.tsx` | MODIFICAR | Simplificar para apenas motoristas |
| `src/components/localizador/LocalizadorCard.tsx` | MODIFICAR | Ajustar layout do card |

---

## Detalhes de Implementação

### 1. PainelLocalizador.tsx (Modificações)

**Remover:**
- Toggle entre motoristas/veículos
- Hook `useLocalizadorVeiculos`
- Lógica de veículos
- Stats de veículos

**Simplificar:**
- Header mais limpo
- Stats apenas para motoristas (Total, Disponíveis, Em Trânsito)
- Colunas apenas de motoristas

```tsx
// REMOVER
const [viewMode, setViewMode] = useState<ViewMode>('veiculos');
const { veiculosPorLocalizacao, ... } = useLocalizadorVeiculos(...);

// MANTER
const { 
  motoristasPorLocalizacao, 
  localizacoes, 
  loading, 
  refetch 
} = useLocalizadorMotoristas(selectedEvento || undefined);
```

**Novo cálculo de stats:**
```tsx
const stats = useMemo(() => {
  const totalMotoristas = Object.values(motoristasPorLocalizacao).flat().length;
  const emTransito = motoristasPorLocalizacao['em_transito']?.length || 0;
  const disponiveis = Object.entries(motoristasPorLocalizacao)
    .filter(([key]) => key !== 'em_transito' && key !== 'sem_local')
    .flatMap(([, arr]) => arr)
    .filter(m => m.status === 'disponivel').length;
  
  return { total: totalMotoristas, emTransito, disponiveis };
}, [motoristasPorLocalizacao]);
```

---

### 2. LocalizadorColumn.tsx (Modificações)

**Simplificar:**
- Remover props de veículos e viewMode
- Focar apenas em motoristas
- Remover condicionais de veículos

```tsx
interface LocalizadorColumnProps {
  titulo: string;
  motoristas: MotoristaComVeiculo[];
  tipo: 'local' | 'em_transito' | 'sem_local';
}
```

**Configuração visual simplificada:**
```tsx
const columnConfig = {
  local: {
    icon: MapPin,
    headerClass: 'bg-primary/20 border-primary/30',
    iconClass: 'text-primary',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  em_transito: {
    icon: Navigation,
    headerClass: 'bg-blue-500/20 border-blue-500/30',
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-500 text-white',
  },
  sem_local: {
    icon: MapPinOff,
    headerClass: 'bg-muted/50 border-border',
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground',
  },
};
```

---

### 3. LocalizadorCard.tsx (Ajustes no Layout)

O card atual já está bom, mas vamos fazer pequenos ajustes para enfatizar a hierarquia:

**Estrutura do Card:**
```text
┌─────────────────────────────────────┐
│  🧑 JOÃO SILVA                  🟢  │  ← Nome grande + indicador status
├─────────────────────────────────────┤
│  🚗 Van Prata • ABC-1234            │  ← Veículo + placa
│      Van • 15 lugares               │  ← Tipo + capacidade
├─────────────────────────────────────┤
│  🟢 Disponível        há 15min      │  ← Status badge + tempo no local
└─────────────────────────────────────┘

// Ou se em trânsito:
┌─────────────────────────────────────┐
│  🧑 MARIA SANTOS                🔵  │
├─────────────────────────────────────┤
│  🚐 Sprinter • XYZ-5678             │
│      Van • 12 lugares               │
├─────────────────────────────────────┤
│  🔵 Em Viagem     Base → Hotel X    │  ← Status + rota
└─────────────────────────────────────┘
```

**Ajustes:**
- Nome do motorista em destaque (font-bold text-lg)
- Veículo como informação secundária
- Status badge com cor correspondente
- Tempo no local ou rota conforme status

---

## Fluxo Visual Final

**Colunas exibidas:**

1. **Base** - Motoristas que fizeram check-in e estão na base do evento
2. **[Pontos de Embarque]** - Colunas dinâmicas baseadas em `ultima_localizacao`
3. **Em Trânsito** - Motoristas com status `em_viagem` (mostra rota)
4. **Sem Localização** - Motoristas sem `ultima_localizacao` definida

---

## Informações no Card

| Elemento | Origem | Descrição |
|----------|--------|-----------|
| Nome do motorista | `motorista.nome` | Destaque principal |
| Indicador de status | `motorista.status` | Bolinha colorida |
| Veículo (nome/placa) | `motorista.veiculo.nome` ou `placa` | Se vinculado |
| Tipo do veículo | `motorista.veiculo.tipo_veiculo` | Van, Ônibus, etc |
| Status badge | `motorista.status` | "Disponível", "Em Viagem", etc |
| Tempo no local | `motorista.ultima_localizacao_at` | "há 15min" |
| Rota (se em viagem) | `viagem_origem` → `viagem_destino` | Exibido quando status = em_viagem |

---

## Seção Técnica

### Remoções no PainelLocalizador

```tsx
// REMOVER estas linhas:
import { useLocalizadorVeiculos } from '@/hooks/useLocalizadorVeiculos';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ViewMode = 'motoristas' | 'veiculos';
const [viewMode, setViewMode] = useState<ViewMode>('veiculos');

const {
  veiculosPorLocalizacao,
  localizacoes: localizacoesVeiculos,
  loading: loadingVeiculos,
  refetch: refetchVeiculos
} = useLocalizadorVeiculos(selectedEvento || undefined);

// Todo o bloco do ToggleGroup no header
// Toda lógica condicional de viewMode
```

### Nova Interface LocalizadorColumn

```tsx
interface LocalizadorColumnProps {
  titulo: string;
  motoristas: MotoristaComVeiculo[];
  tipo: 'local' | 'em_transito' | 'sem_local';
}

export function LocalizadorColumn({ 
  titulo, 
  motoristas,
  tipo
}: LocalizadorColumnProps) {
  // Implementação simplificada sem viewMode
}
```

### Observações

- O hook `useLocalizadorMotoristas` já agrupa motoristas por `ultima_localizacao`
- Motoristas com `status === 'em_viagem'` vão para coluna "Em Trânsito"
- Motoristas sem `ultima_localizacao` vão para coluna "Sem Localização"
- Realtime subscription já está configurada e continuará funcionando
- O arquivo `LocalizadorVeiculoCard.tsx` pode ser removido ou mantido para uso futuro
