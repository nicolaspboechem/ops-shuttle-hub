

# Corrigir divergencia de dados no dashboard do cliente

## Problema verificado no evento "Routes Hotel 2026 - Galeao"

O evento tem 2 viagens shuttle ativas com 22 pax no dia operacional de hoje. A configuracao e `tipos_viagem_habilitados: [missao, shuttle]`, `horario_virada_dia: 04:00`.

O `ClienteDashboardTab` (linha 43) chama `useViagens(eventoId)` **sem filtro de dia operacional**. Para este evento com apenas 2 viagens, os numeros coincidem por sorte. Mas em eventos maiores (com centenas de viagens), o hook retorna no maximo 500 registros aleatorios de todos os dias, causando a divergencia relatada.

Alem disso, o `horarioVirada` do evento nao e passado ao dashboard -- ele usa hardcoded `'04:00'` para calcular `dataOperacional` dos motoristas, mas nao aplica esse filtro nas viagens.

## Mudancas

### 1. Passar `horarioVirada` do evento ao dashboard

**Arquivo:** `src/pages/app/AppCliente.tsx`

- Adicionar prop `horarioVirada` na chamada do `ClienteDashboardTab`:

```typescript
return <ClienteDashboardTab 
  key={refreshKey} 
  eventoId={eventoId} 
  tiposViagem={evento?.tipos_viagem_habilitados} 
  horarioVirada={evento?.horario_virada_dia || undefined}
/>;
```

### 2. Filtrar viagens por dia operacional no dashboard

**Arquivo:** `src/components/app/ClienteDashboardTab.tsx`

- Adicionar `horarioVirada?: string` a interface `ClienteDashboardTabProps`
- Calcular `dataOperacional` usando o `horarioVirada` recebido (em vez do hardcoded `'04:00'`)
- Passar `{ dataOperacional, horarioVirada }` como options para `useViagens`:

```typescript
const horarioViradaFinal = horarioVirada || '04:00';

const dataOperacional = useMemo(() => {
  return getDataOperacional(getAgoraSync(), horarioViradaFinal);
}, [getAgoraSync, horarioViradaFinal]);

const viagensOptions = useMemo(() => ({
  dataOperacional,
  horarioVirada: horarioViradaFinal,
}), [dataOperacional, horarioViradaFinal]);

const { viagens: todasViagens, loading, lastUpdate } = useViagens(eventoId, viagensOptions);
```

- Atualizar o `dataOperacional` dos motoristas para usar o mesmo `horarioViradaFinal` (linha 68-71 atualmente usa `'04:00'` hardcoded)

### 3. Unificar logica de contadores

No mesmo arquivo, simplificar `contadoresOperacao` (linha 56-63) para derivar dos dados ja filtrados por `useCalculos`, evitando o filtro duplicado com `!v.encerrado`:

```typescript
const contadoresOperacao = useMemo(() => {
  const ativas = todasViagens.filter(v => v.status !== 'encerrado' && v.status !== 'cancelado');
  return {
    transfer: ativas.filter(v => v.tipo_operacao === 'transfer' && !v.origem_missao_id).length,
    shuttle: ativas.filter(v => v.tipo_operacao === 'shuttle' && !v.origem_missao_id).length,
    missao: ativas.filter(v => !!v.origem_missao_id).length,
  };
}, [todasViagens]);
```

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/app/AppCliente.tsx` | Passar `horarioVirada` do evento ao dashboard |
| `src/components/app/ClienteDashboardTab.tsx` | Filtrar viagens por dia operacional, usar `horarioVirada` do evento, unificar contadores |

## Resultado esperado

No evento "Routes Hotel 2026 - Galeao", a aba "Geral" mostrara as 2 viagens shuttle ativas do dia com 22 pax, e a aba "Shuttle" mostrara os mesmos dados. A aba "Missao" mostrara 0. Eventos com muitos dias de operacao mostrarao apenas os dados do dia operacional atual, sem divergencia.

