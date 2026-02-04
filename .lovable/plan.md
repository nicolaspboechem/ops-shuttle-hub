
# Plano: Adicionar Suporte a Múltiplos Dias de Evento

## Contexto

Os eventos podem durar vários dias. Atualmente:
- O check-in de presença já usa "data operacional" (considera horário de virada)
- As viagens têm timestamp de criação (`data_criacao`)
- **Problema**: Os painéis exibem TODAS as viagens do evento, sem filtro por dia

Isso torna confuso quando há centenas de viagens acumuladas de dias anteriores.

---

## Solução

Adicionar filtro de **Dia Operacional** nos painéis e apps para mostrar apenas as viagens do dia selecionado.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useViagens.ts` | Adicionar parâmetro opcional de data e filtrar por dia operacional |
| `src/lib/utils/diaOperacional.ts` | Adicionar função para obter limites de timestamp de um dia operacional |
| `src/pages/app/AppOperador.tsx` | Adicionar seletor de data com padrão "hoje" |
| `src/pages/app/AppSupervisor.tsx` | Adicionar seletor de data |
| `src/components/app/SupervisorViagensTab.tsx` | Receber e aplicar filtro de data |
| `src/pages/Dashboard.tsx` | Adicionar seletor de dia |
| `src/pages/ViagensAtivas.tsx` | Adicionar seletor de dia |
| `src/pages/ViagensFinalizadas.tsx` | Adicionar seletor de dia |

---

## Seção Técnica

### 1. Nova Função - Limites do Dia Operacional

Adicionar em `src/lib/utils/diaOperacional.ts`:

```typescript
/**
 * Retorna os limites de timestamp (início e fim) para um dia operacional.
 * 
 * Exemplo: 
 * - Data operacional: 2025-01-14
 * - Horário virada: 04:00
 * - Início: 2025-01-14 04:00
 * - Fim: 2025-01-15 03:59:59
 */
export function getLimitesDiaOperacional(
  dataOperacional: string,  // "YYYY-MM-DD"
  horarioVirada: string = '04:00'
): { inicio: Date; fim: Date } {
  const [horaVirada, minVirada] = horarioVirada.split(':').map(Number);
  
  // Início: data + horário virada
  const inicio = new Date(dataOperacional);
  inicio.setHours(horaVirada, minVirada || 0, 0, 0);
  
  // Fim: próximo dia + horário virada - 1 segundo
  const fim = addDays(inicio, 1);
  fim.setSeconds(fim.getSeconds() - 1);
  
  return { inicio, fim };
}
```

### 2. Modificar Hook useViagens

Adicionar filtro opcional por data operacional:

```typescript
export function useViagens(
  eventoId?: string, 
  options?: { 
    dataOperacional?: string;
    horarioVirada?: string;
  }
) {
  // ... código existente ...

  const fetchViagens = useCallback(async () => {
    let query = supabase
      .from('viagens')
      .select(`*`)
      .order('h_pickup', { ascending: true });

    if (eventoId) query = query.eq('evento_id', eventoId);

    // Filtro por dia operacional
    if (options?.dataOperacional) {
      const { inicio, fim } = getLimitesDiaOperacional(
        options.dataOperacional,
        options.horarioVirada || '04:00'
      );
      query = query
        .gte('data_criacao', inicio.toISOString())
        .lte('data_criacao', fim.toISOString());
    }

    const { data, error } = await query;
    // ...
  }, [eventoId, options?.dataOperacional, options?.horarioVirada]);
}
```

### 3. Componente Seletor de Dia

Criar um componente reutilizável para selecionar o dia operacional:

```typescript
// src/components/app/DiaSeletor.tsx
interface DiaSeletorProps {
  dataOperacional: string;
  onChange: (data: string) => void;
  dataInicio?: string;
  dataFim?: string;
}

export function DiaSeletor({ 
  dataOperacional, 
  onChange, 
  dataInicio, 
  dataFim 
}: DiaSeletorProps) {
  // Botões: ← Anterior | [Data atual] | Próximo →
  // Restringir ao intervalo do evento se data_inicio/data_fim existirem
}
```

### 4. Aplicar no App Operador

```typescript
export default function AppOperador() {
  const { getAgoraSync } = useServerTime();
  const [evento, setEvento] = useState<Evento | null>(null);
  
  // Data operacional selecionada (padrão: hoje)
  const [dataOperacional, setDataOperacional] = useState(() => 
    getDataOperacional(getAgoraSync(), evento?.horario_virada_dia || '04:00')
  );
  
  // Buscar viagens apenas do dia selecionado
  const { viagens, loading, refetch } = useViagens(eventoId, {
    dataOperacional,
    horarioVirada: evento?.horario_virada_dia
  });
  
  // No header, adicionar DiaSeletor
  <DiaSeletor 
    dataOperacional={dataOperacional}
    onChange={setDataOperacional}
    dataInicio={evento?.data_inicio}
    dataFim={evento?.data_fim}
  />
}
```

### 5. Aplicar no Dashboard Admin

Mesmo padrão do App Operador - seletor de dia no topo.

### 6. Modo "Todos os dias" (Opcional)

Adicionar opção para ver todas as viagens quando necessário:

```typescript
const [verTodosDias, setVerTodosDias] = useState(false);

// Se verTodosDias = true, não passa dataOperacional
const { viagens } = useViagens(eventoId, 
  verTodosDias ? undefined : { dataOperacional, horarioVirada }
);
```

---

## Interface do Usuário

O seletor de dia aparecerá no header/topo das páginas:

```text
┌──────────────────────────────────────────────────────┐
│   ◀   Ter, 04 Fev 2025  ▶    [Ver todos os dias]    │
└──────────────────────────────────────────────────────┘
```

- Setas navegam entre dias
- Botão central abre calendário
- "Ver todos os dias" desativa o filtro temporariamente

---

## Dependências de Dados

Para que o filtro funcione corretamente:

1. `eventos.horario_virada_dia` - já existe ✅
2. `eventos.data_inicio` e `eventos.data_fim` - já existem ✅
3. `viagens.data_criacao` - já existe (timestamp) ✅

---

## Considerações

### Por que não criar uma coluna `data_operacional` nas viagens?

Alternativa possível, mas:
- Requer migração para viagens existentes
- Adiciona complexidade de manutenção
- O cálculo em tempo real é rápido e preciso

### Filtro no frontend vs backend?

**Recomendação: Backend (Supabase query)**
- Reduz dados transferidos
- Mais eficiente para eventos grandes
- A query já filtra por `data_criacao` com limites calculados

---

## Resultado Esperado

1. Operadores veem apenas viagens do dia atual por padrão
2. Supervisores podem navegar entre dias do evento
3. Dashboard mostra métricas do dia selecionado
4. Possibilidade de ver "todos os dias" quando necessário
5. Viagens de madrugada (ex: 02:00) são corretamente agrupadas no dia anterior
