
# Plano: Filtrar Painel Localizador por Check-in Ativo

## Contexto

Atualmente, o Painel Localizador exibe TODOS os motoristas cadastrados no evento, independentemente de terem feito check-in ou não. Isso gera poluição visual e confusão.

**Comportamento desejado:**
- Motorista faz check-in → aparece no painel
- Motorista faz check-out → sai do painel
- Motorista não fez check-in hoje → não aparece

---

## Solução

Modificar o hook `useLocalizadorMotoristas` para:
1. Buscar registros de presença do dia operacional atual
2. Filtrar apenas motoristas com check-in ativo (checkin_at preenchido, checkout_at nulo)
3. Adicionar subscription Realtime para `motorista_presenca`

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useLocalizadorMotoristas.ts` | Adicionar busca de presença e filtro por check-in ativo |

---

## Seção Técnica

### Modificações no Hook

```typescript
// useLocalizadorMotoristas.ts

export function useLocalizadorMotoristas(eventoId: string | undefined) {
  // ... estados existentes ...

  const fetchMotoristas = useCallback(async () => {
    if (!eventoId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar configuração do evento (horário de virada)
      const { data: evento } = await supabase
        .from('eventos')
        .select('horario_virada_dia')
        .eq('id', eventoId)
        .single();
      
      const horarioVirada = evento?.horario_virada_dia?.substring(0, 5) || '04:00';
      const dataOperacional = getDataOperacional(new Date(), horarioVirada);

      // 2. Buscar presenças do dia com check-in ativo (sem checkout)
      const { data: presencasAtivas } = await supabase
        .from('motorista_presenca')
        .select('motorista_id')
        .eq('evento_id', eventoId)
        .eq('data', dataOperacional)
        .not('checkin_at', 'is', null)   // Tem check-in
        .is('checkout_at', null);        // Não tem check-out

      // Criar Set de IDs de motoristas com check-in ativo
      const motoristasComCheckinAtivo = new Set(
        presencasAtivas?.map(p => p.motorista_id) || []
      );

      // 3. Buscar motoristas
      const { data: motoristasData, error } = await supabase
        .from('motoristas')
        .select('*')
        .eq('evento_id', eventoId)
        .order('nome');

      if (error) throw error;

      // 4. Filtrar apenas motoristas com check-in ativo
      const motoristasFiltrados = (motoristasData || [])
        .filter(m => motoristasComCheckinAtivo.has(m.id));

      // ... resto do código (buscar veículos, viagens, etc) ...
      // Aplicar filtro em motoristasFiltrados ao invés de motoristasData
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  // Realtime subscription - ADICIONAR motorista_presenca
  useEffect(() => {
    if (!eventoId) return;

    const channel = supabase
      .channel('localizador-motoristas')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'motoristas',
        filter: `evento_id=eq.${eventoId}`,
      }, () => fetchMotoristas())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'viagens',
        filter: `evento_id=eq.${eventoId}`,
      }, () => fetchMotoristas())
      // NOVO: Escutar mudanças de presença
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'motorista_presenca',
        filter: `evento_id=eq.${eventoId}`,
      }, () => fetchMotoristas())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoId, fetchMotoristas]);
}
```

### Lógica de Filtro

```text
Fluxo:
┌─────────────────────────────────────────────────────┐
│ Motorista faz CHECK-IN                              │
│ → Cria registro em motorista_presenca               │
│ → checkin_at = NOW()                                │
│ → checkout_at = NULL                                │
│ → Trigger Realtime dispara                          │
│ → Hook refetch()                                    │
│ → Motorista APARECE no painel                       │
├─────────────────────────────────────────────────────┤
│ Motorista faz CHECK-OUT                             │
│ → Atualiza registro em motorista_presenca           │
│ → checkout_at = NOW()                               │
│ → Trigger Realtime dispara                          │
│ → Hook refetch()                                    │
│ → Motorista DESAPARECE do painel                    │
└─────────────────────────────────────────────────────┘
```

### Query de Presença

A busca de presenças ativas usa:
- `eq('data', dataOperacional)` - Apenas do dia atual
- `not('checkin_at', 'is', null)` - Tem check-in registrado  
- `is('checkout_at', null)` - Não fez check-out ainda

---

## Impacto

### Componentes que usam o hook:
1. **PainelLocalizador.tsx** - Painel público Kanban
2. **SupervisorLocalizadorTab.tsx** - Aba no App Supervisor  
3. **ClienteLocalizadorTab.tsx** - Aba no App Cliente

Todos passarão a exibir apenas motoristas com check-in ativo automaticamente.

---

## Resultado Esperado

1. Painel fica limpo, mostrando apenas quem está "em serviço"
2. Check-in → motorista aparece instantaneamente (Realtime)
3. Check-out → motorista some instantaneamente (Realtime)
4. Sem check-in no dia → não aparece
5. Reduz poluição visual e facilita monitoramento
