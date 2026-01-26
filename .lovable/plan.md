
# Plano: Evolução do Localizador de Frota com Foco em Veículos

## Objetivo

Transformar o Painel Localizador de Frota para mostrar **veículos** como entidade principal (não apenas motoristas), exibindo:
- Rota atual (de onde → para onde)
- Localização atual (onde está parado)
- Motorista vinculado ao veículo
- Status em tempo real (Em Rota, Disponível, Sem Motorista)

---

## Situação Atual

O localizador exibe **motoristas** agrupados por localização:
- Cards mostram: nome do motorista, veículo vinculado, status, destino
- Colunas: localizações fixas + "Em Trânsito" + "Sem Localização"
- Foco no motorista, veículo é informação secundária

---

## Nova Visão - Foco em Veículos

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOCALIZADOR DE FROTA                                 │
│  [Toggle: Motoristas | Veículos]                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  📍 BASE     │ │ 📍 HOTEL A   │ │ 🚗 EM ROTA   │ │ ⚠️ S/ MOTOR. │   │
│  │     (5)      │ │     (3)      │ │     (2)      │ │     (1)      │   │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤   │
│  │              │ │              │ │              │ │              │   │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │   │
│  │ │ 🚐 VAN-01│ │ │ │ 🚌 BUS-02│ │ │ │ 🚐 VAN-03│ │ │ │ 🚐 VAN-04│ │   │
│  │ │ ABC-1234 │ │ │ │ DEF-5678 │ │ │ │ GHI-9012 │ │ │ │ JKL-3456 │ │   │
│  │ │          │ │ │ │          │ │ │ │          │ │ │ │          │   │
│  │ │ 👤 João  │ │ │ │ 👤 Pedro │ │ │ │ 👤 Maria │ │ │ │ 👤 ---   │   │
│  │ │ ⏱ 15min  │ │ │ │ ⏱ 5min   │ │ │ │ SDU→Hotel│ │ │ │ ⚠️ Livre │   │
│  │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │   │
│  │              │ │              │ │              │ │              │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Criar Hook `useLocalizadorVeiculos`

**Arquivo:** `src/hooks/useLocalizadorVeiculos.ts`

Novo hook que:
- Busca todos os veículos do evento
- Busca motoristas vinculados a cada veículo
- Busca viagens ativas para determinar rota
- Agrupa veículos por localização (derivada do motorista ou última viagem)

**Interface:**
```typescript
interface VeiculoComRota {
  // Dados do veículo
  id: string;
  placa: string;
  nome: string | null;
  tipo_veiculo: string;
  status: string;
  
  // Motorista vinculado
  motorista: Motorista | null;
  
  // Dados de rota (se em viagem)
  em_rota: boolean;
  origem?: string;
  destino?: string;
  h_inicio?: string;
  
  // Localização
  ultima_localizacao: string | null;
  ultima_localizacao_at: string | null;
}
```

---

### 2. Criar Componente `LocalizadorVeiculoCard`

**Arquivo:** `src/components/localizador/LocalizadorVeiculoCard.tsx`

Card focado no veículo:
- **Header**: Nome/Apelido do veículo + ícone por tipo
- **Placa**: Destaque visual
- **Motorista**: Nome do motorista vinculado ou "Sem motorista"
- **Status**:
  - Em Rota: "SDU → Hotel Barra" com seta animada
  - Disponível: "há X minutos"
  - Sem motorista: Badge de alerta
- **Indicador visual**: Cor do card baseada no status

---

### 3. Atualizar Componentes Existentes

**Arquivo:** `src/pages/PainelLocalizador.tsx`

Adicionar:
- Toggle para alternar entre visualização "Motoristas" e "Veículos"
- Integração com novo hook `useLocalizadorVeiculos`
- Lógica de agrupamento por localização do veículo

**Arquivo:** `src/components/localizador/LocalizadorColumn.tsx`

- Suportar renderização de cards de veículos
- Prop adicional para tipo de visualização

---

### 4. Lógica de Localização do Veículo

A localização do veículo será derivada de:

1. **Em viagem**: Se motorista tem status `em_viagem` → veículo vai para coluna "Em Rota"
2. **Com motorista parado**: Usa `motorista.ultima_localizacao`
3. **Sem motorista**: Usa última viagem encerrada do veículo (ponto_desembarque)
4. **Desconhecida**: Coluna "Sem Localização"

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useLocalizadorVeiculos.ts` | **CRIAR** | Hook para buscar veículos com rotas |
| `src/components/localizador/LocalizadorVeiculoCard.tsx` | **CRIAR** | Card de veículo com info de rota |
| `src/pages/PainelLocalizador.tsx` | MODIFICAR | Adicionar toggle e view de veículos |
| `src/components/localizador/LocalizadorColumn.tsx` | MODIFICAR | Suportar cards de veículos |
| `src/hooks/useLocalizadorMotoristas.ts` | MODIFICAR | Adicionar info de origem da viagem |

---

## Detalhes de Implementação

### VeiculoComRota Interface Completa

```typescript
interface VeiculoComRota {
  id: string;
  placa: string;
  nome: string | null;
  tipo_veiculo: string;
  capacidade: number | null;
  status: string; // liberado, pendente, etc
  
  // Motorista vinculado (via motoristas.veiculo_id ou veiculos.motorista_id)
  motorista: {
    id: string;
    nome: string;
    status: string; // disponivel, em_viagem, etc
  } | null;
  
  // Rota atual (se motorista em viagem)
  em_rota: boolean;
  viagem?: {
    id: string;
    origem: string;
    destino: string;
    h_inicio_real: string;
    tempo_em_rota: number; // minutos
  };
  
  // Localização quando parado
  ultima_localizacao: string | null;
  ultima_localizacao_at: string | null;
}
```

### LocalizadorVeiculoCard - Visual

```text
┌─────────────────────────────────────┐
│  🚐  VAN PRATA-01                   │  ← Nome/Apelido
│      ABC-1234 • Van                 │  ← Placa + Tipo
├─────────────────────────────────────┤
│                                     │
│  👤 João Silva                      │  ← Motorista
│     Disponível                      │  ← Status motorista
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [🟢 Disponível]        há 15min    │  ← Status + tempo
│                                     │
└─────────────────────────────────────┘

--- OU para veículo em rota: ---

┌─────────────────────────────────────┐
│  🚌  ÔNIBUS AZUL                    │
│      DEF-5678 • Ônibus              │
├─────────────────────────────────────┤
│                                     │
│  👤 Maria Santos                    │
│     Em viagem                       │
│                                     │
├─────────────────────────────────────┤
│  SDU  ─────────→  Hotel Barra       │  ← Rota visual
│  [🔵 Em Rota]            ⏱ 23min    │  ← Status + duração
└─────────────────────────────────────┘
```

---

## Fluxo de Dados

1. **Fetch Inicial**:
   - Busca veículos do evento
   - Busca motoristas do evento
   - Busca viagens ativas (status = 'em_andamento')

2. **Montagem dos Cards**:
   - Para cada veículo, encontra motorista vinculado
   - Se motorista em viagem, busca dados da viagem (origem, destino)
   - Calcula localização baseada nas regras

3. **Agrupamento**:
   - "Em Rota": veículos cujo motorista tem viagem ativa
   - Localizações: usa ultima_localizacao do motorista
   - "Sem Motorista": veículos sem motorista vinculado
   - "Sem Localização": resto

4. **Realtime**:
   - Subscribe em: motoristas, veiculos, viagens
   - Re-fetch automático em mudanças

---

## Benefícios

1. **Visão centrada em ativos**: Veículos são os ativos monitorados
2. **Informação de rota**: Saber de onde para onde cada veículo está indo
3. **Rastreabilidade**: Qual motorista está com qual veículo
4. **Alertas visuais**: Veículos sem motorista destacados
5. **Flexibilidade**: Toggle permite alternar entre visualizações

---

## Toggle de Visualização

O painel terá um toggle para alternar:
- **Motoristas**: Visualização atual (cards de motoristas)
- **Veículos**: Nova visualização (cards de veículos com rotas)

Isso permite que o CCO escolha a perspectiva mais útil para cada situação.
