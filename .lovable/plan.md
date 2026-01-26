
# Plano: Sincronização Total de Timestamps com Fuso Horário de São Paulo

## Problema Identificado

Existe uma **inconsistência crítica** na forma como timestamps são gerados e usados no sistema:

### Situação Atual

| Componente | Método Usado | Problema |
|------------|--------------|----------|
| `CreateViagemMotoristaForm` | `useServerTime().getAgoraSync()` | Correto - sincronizado |
| `CreateViagemForm` | `useServerTime().getAgoraSync()` | Correto - sincronizado |
| `RetornoViagemForm` | `useServerTime().getAgoraSync()` | Correto - sincronizado |
| `useViagemOperacao` (iniciar/chegada/encerrar) | `new Date()` | **ERRADO** - hora local do dispositivo |
| `useMotoristaPresenca` (check-in/checkout) | `new Date().toISOString()` | **ERRADO** - hora local do dispositivo |
| `useEquipe` (check-in/checkout admin) | `new Date().toISOString()` | **ERRADO** - hora local do dispositivo |
| `calculadores.ts` (alertas) | `new Date()` | **ERRADO** - hora local do dispositivo |
| `PainelLocalizador` (relógio) | `new Date()` | **ERRADO** - hora local do dispositivo |
| `CheckinCheckoutCard` (data do dia) | `new Date()` | **ERRADO** - hora local do dispositivo |
| Edge Functions (sync-data, close-open-trips) | `new Date()` | **ERRADO** - hora do servidor Deno |

### O Hook `useServerTime` Funciona Corretamente

O hook já:
1. Chama a RPC `get_server_time()` que retorna `NOW() AT TIME ZONE 'America/Sao_Paulo'`
2. Calcula o offset entre hora do servidor e hora local do dispositivo
3. Fornece `getAgoraSync()` que aplica o offset para retornar hora sincronizada

**O problema é que muitos componentes NÃO usam esse hook**.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useViagemOperacao.ts` | MODIFICAR | Usar `useServerTime` para todos os timestamps |
| `src/hooks/useMotoristaPresenca.ts` | MODIFICAR | Usar `useServerTime` para check-in/checkout |
| `src/hooks/useEquipe.ts` | MODIFICAR | Usar `useServerTime` para operações de presença |
| `src/lib/utils/calculadores.ts` | MODIFICAR | Receber função `getAgoraSync` como parâmetro |
| `src/pages/PainelLocalizador.tsx` | MODIFICAR | Sincronizar relógio com servidor |
| `src/components/app/CheckinCheckoutCard.tsx` | MODIFICAR | Usar data sincronizada |
| `supabase/functions/sync-data/index.ts` | MODIFICAR | Obter hora do banco |
| `supabase/functions/close-open-trips/index.ts` | MODIFICAR | Obter hora do banco |

---

## Detalhes de Implementação

### 1. Modificar `useViagemOperacao.ts`

Adicionar `useServerTime` e substituir todas as instâncias de `new Date()`:

```typescript
import { useServerTime } from '@/hooks/useServerTime';

export function useViagemOperacao() {
  const { user } = useAuth();
  const { getAgoraSync } = useServerTime();

  // Substituir em iniciarViagem (linha 126):
  // DE: h_inicio_real: new Date().toISOString()
  // PARA: h_inicio_real: getAgoraSync().toISOString()

  // Substituir em registrarChegada (linha 157-158):
  // DE: const now = new Date(); 
  //     const horaChegada = now.toTimeString().slice(0, 8);
  // PARA: const now = getAgoraSync();
  //       const horaChegada = now.toTimeString().slice(0, 8);

  // Substituir em encerrarViagem (linha 217):
  // DE: h_fim_real: new Date().toISOString()
  // PARA: h_fim_real: getAgoraSync().toISOString()

  // Substituir em iniciarRetorno (linha 283):
  // DE: const now = new Date();
  // PARA: const now = getAgoraSync();

  // Substituir em atualizarLocalizacaoMotorista:
  // DE: ultima_localizacao_at: new Date().toISOString()
  // PARA: ultima_localizacao_at: agoraSync.toISOString()
}
```

**Problema com helpers fora do hook**: As funções `atualizarStatusMotorista` e `atualizarLocalizacaoMotorista` estão fora do hook React, então não podem usar `useServerTime` diretamente. Solução: passar a data sincronizada como parâmetro.

### 2. Modificar `useMotoristaPresenca.ts`

```typescript
import { useServerTime } from '@/hooks/useServerTime';

export function useMotoristaPresenca(...) {
  const { getAgoraSync } = useServerTime();
  
  const realizarCheckin = async () => {
    // Linha 130 - substituir:
    // DE: const now = new Date().toISOString();
    // PARA: const now = getAgoraSync().toISOString();
  };

  const realizarCheckout = async (observacao?: string) => {
    // Linha 195 - substituir:
    // DE: const now = new Date().toISOString();
    // PARA: const now = getAgoraSync().toISOString();
  };
}
```

### 3. Modificar `useEquipe.ts`

```typescript
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';

export function useEquipe(eventoId?: string) {
  const { getAgoraSync } = useServerTime();
  
  const fetchEquipe = async () => {
    // Linha 72 - usar data operacional sincronizada:
    // DE: const today = new Date().toISOString().split('T')[0];
    // PARA: const today = getDataOperacional(getAgoraSync());
  };

  const handleCheckin = async (motoristaId: string) => {
    // Linhas 138-139 - substituir:
    // DE: const today = new Date().toISOString().split('T')[0];
    //     const now = new Date().toISOString();
    // PARA: const agora = getAgoraSync();
    //       const today = getDataOperacional(agora);
    //       const now = agora.toISOString();
  };

  const handleCheckout = async (motoristaId: string) => {
    // Linhas 185-186 - mesma lógica
  };
}
```

### 4. Modificar `calculadores.ts`

Modificar `calcularStatusViagem` para receber a hora sincronizada:

```typescript
export function calcularStatusViagem(
  viagem: Viagem,
  tempoMedioMotorista: number,
  agoraSincronizado?: Date  // Novo parâmetro opcional
): AlertaViagem {
  // Linha 106 - substituir:
  // DE: const now = new Date();
  // PARA: const now = agoraSincronizado || new Date();
}

export function calcularKPIsDashboard(
  viagens: Viagem[],
  agoraSincronizado?: Date
): KPIsDashboard {
  // Passar para calcularStatusViagem
  alertas.push(calcularStatusViagem(viagem, tempoMedio, agoraSincronizado));
}
```

### 5. Modificar `PainelLocalizador.tsx`

Sincronizar o relógio exibido com o servidor:

```typescript
import { useServerTime } from '@/hooks/useServerTime';

export default function PainelLocalizador() {
  const { getAgoraSync, offset } = useServerTime();
  const [currentTime, setCurrentTime] = useState(() => getAgoraSync());

  // Atualizar relógio usando offset sincronizado
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date(Date.now() + offset));
    }, 1000);

    return () => clearInterval(interval);
  }, [offset]);
}
```

### 6. Modificar `CheckinCheckoutCard.tsx`

```typescript
import { useServerTime } from '@/hooks/useServerTime';

export function CheckinCheckoutCard(...) {
  const { getAgoraSync } = useServerTime();
  
  // Linha 36 - substituir:
  // DE: const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  // PARA: const hoje = format(getAgoraSync(), "EEEE, dd 'de' MMMM", { locale: ptBR });
}
```

### 7. Modificar Edge Functions

**sync-data/index.ts:**

```typescript
// Linha 17-18 - substituir:
// DE: const now = new Date();
//     const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
// PARA: Usar hora do próprio banco de dados

const { data: serverTimeData } = await supabase.rpc('get_server_time');
const spTime = serverTimeData ? new Date(serverTimeData) : new Date();
```

**close-open-trips/index.ts:**

Mesma lógica - usar `get_server_time` RPC ao invés de `new Date()`.

---

## Fluxo de Sincronização

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVIDOR (Supabase)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  get_server_time() → NOW() AT TIME ZONE 'America/Sao_Paulo'     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 ↓                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (useServerTime)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Chama get_server_time() no mount                            │   │
│  │  2. Calcula offset = serverTime - localTime                     │   │
│  │  3. Ressincroniza a cada 5 minutos                              │   │
│  │  4. getAgoraSync() = new Date(Date.now() + offset)              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 ↓                                       │
│  Componentes usam getAgoraSync() para:                                  │
│  • Criar viagens (h_pickup, h_inicio_real)                              │
│  • Registrar chegadas (h_chegada, h_fim_real)                           │
│  • Check-in/Check-out (checkin_at, checkout_at)                         │
│  • Calcular alertas de atraso                                           │
│  • Exibir relógios sincronizados                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Impacto nas Funcionalidades

| Funcionalidade | Antes | Depois |
|----------------|-------|--------|
| Criação de viagem | Hora sincronizada | Hora sincronizada |
| Iniciar viagem | Hora LOCAL (erro) | Hora sincronizada |
| Registrar chegada | Hora LOCAL (erro) | Hora sincronizada |
| Check-in motorista | Hora LOCAL (erro) | Hora sincronizada |
| Alertas de atraso | Cálculo com hora LOCAL (erro) | Cálculo sincronizado |
| Relógio do Localizador | Hora LOCAL | Hora São Paulo |
| Edge Functions | Hora do container Deno | Hora São Paulo via DB |

---

## Seção Técnica

### Ordem de Implementação

1. **useViagemOperacao.ts** - Crítico para operações de viagem
2. **useMotoristaPresenca.ts** - Crítico para controle de presença
3. **useEquipe.ts** - Admin check-in/checkout
4. **calculadores.ts** - Alertas em tempo real
5. **PainelLocalizador.tsx** - Relógio visual
6. **CheckinCheckoutCard.tsx** - Exibição de data
7. Edge Functions - Backend sync

### Considerações sobre Edge Functions

As Edge Functions rodam em Deno e não têm acesso ao hook React. Devem usar a RPC `get_server_time` diretamente:

```typescript
const { data: serverTime } = await supabase.rpc('get_server_time');
const now = serverTime ? new Date(serverTime) : new Date();
```

### Tratamento de Fallback

Se a sincronização falhar (erro de rede, etc.), o sistema deve continuar funcionando com hora local como fallback, mas registrar um warning no console. O hook `useServerTime` já faz isso implicitamente (offset = 0 se falhar).

### Nota sobre Realtime

As assinaturas Realtime continuarão funcionando normalmente. Os timestamps armazenados no banco estarão corretos, e a exibição será calculada no frontend com o offset sincronizado.
