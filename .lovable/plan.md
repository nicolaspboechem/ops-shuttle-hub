

# Melhorar o Dashboard com Status de Motoristas em Tempo Real

## Problema atual

O dashboard mostra "Motoristas" apenas como o numero de motoristas em viagens ativas (derivado das viagens), sem considerar o sistema de presenca (check-in/check-out) nem o status de missoes. Falta visibilidade sobre quem esta online, disponivel ou ocupado.

## Nova secao: Motoristas em Tempo Real

Adicionar um painel de status de motoristas logo abaixo das metricas principais, usando dados de presenca (`motorista_presenca`) e missoes ativas (`missoes`).

### Metricas de motoristas (3 indicadores visuais)

| Indicador | Fonte de dados | Cor |
|---|---|---|
| **Online** | Motoristas com check-in ativo (sem checkout) no dia | Verde |
| **Disponiveis** | Online, sem missao ativa nem viagem em andamento | Verde claro |
| **Em Transito** | Com viagem ativa ou missao `em_andamento` | Azul |

### Dados operacionais que o dashboard deve exibir

Alem dos motoristas, vamos garantir que os KPIs existentes reflitam dados corretos:

1. **Viagens Ativas** - ja existe, manter
2. **PAX em Transito** - ja existe, manter
3. **Motoristas Online / Disponiveis / Em Transito** - NOVO
4. **Veiculos em uso** - ja existe, manter
5. **Tempo Medio** - ja existe, manter
6. **Alertas** - ja existe, manter
7. **Rankings** - ja existe, manter

## Detalhes tecnicos

### 1. Dashboard.tsx e DashboardMobile.tsx - Buscar presenca e missoes

Adicionar fetch de:
- `motorista_presenca` do dia operacional (check-in ativo, sem checkout) para contar motoristas **online**
- `missoes` ativas (status `pendente`, `aceita`, `em_andamento`) para derivar quem esta disponivel vs ocupado

```tsx
// Buscar presencas ativas do dia
const { data: presencasAtivas } = await supabase
  .from('motorista_presenca')
  .select('motorista_id')
  .eq('evento_id', eventoId)
  .eq('data', dataOperacional)
  .not('checkin_at', 'is', null)
  .is('checkout_at', null);

// Buscar missoes ativas
const { data: missoesAtivas } = await supabase
  .from('missoes')
  .select('motorista_id, status')
  .eq('evento_id', eventoId)
  .in('status', ['pendente', 'aceita', 'em_andamento']);
```

Calcular:
- **Online** = total de motoristas com presenca ativa
- **Em Transito** = motoristas com missao `em_andamento` ou viagem ativa
- **Disponiveis** = Online - Em Transito - com missao pendente/aceita

### 2. Novo componente: MotoristaStatusPanel

Card horizontal com 3 indicadores circulares lado a lado, estilo semaforo:

```
[  Online: 8  ] [  Disponiveis: 5  ] [  Em Transito: 3  ]
     verde            verde claro          azul
```

Sera exibido tanto no desktop (Dashboard.tsx) quanto no mobile (DashboardMobile.tsx).

### 3. Substituir o card "Motoristas" atual

O card atual mostra "motoristas ativos" baseado apenas em viagens. Sera substituido pelo novo painel com os 3 indicadores, que sao mais precisos e uteis para a operacao.

### 4. Criar hook useMotoristasDashboard

Hook dedicado para o dashboard que busca presenca + missoes e retorna as contagens. Inclui Realtime subscription para atualizacao automatica.

```tsx
export function useMotoristasDashboard(eventoId: string, dataOperacional: string) {
  // Retorna { online, disponiveis, emTransito, loading }
}
```

## Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useMotoristasDashboard.ts` | NOVO - hook para buscar presenca + missoes do dashboard |
| `src/components/dashboard/MotoristaStatusPanel.tsx` | NOVO - painel visual com 3 indicadores |
| `src/pages/Dashboard.tsx` | Usar novo hook e componente, substituir card "Motoristas" |
| `src/components/dashboard/DashboardMobile.tsx` | Mesmo: usar novo hook e componente |

## Resultado

- Visibilidade imediata de quantos motoristas estao online, disponiveis e em transito
- Dados derivados de presenca real (check-in) + missoes, nao apenas viagens
- Atualizacao em tempo real via Supabase Realtime
- Consistente com a logica de status implementada no Localizador (v1.6.0)
