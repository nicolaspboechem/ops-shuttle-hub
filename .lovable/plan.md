
# Plano: Adicionar Evento às Notificações

## Contexto

O sistema atualmente busca notificações globalmente de todas as fontes sem filtrar por evento. Como teremos múltiplos eventos simultâneos, cada notificação precisa mostrar de qual evento ela se origina.

---

## Solução

1. **Incluir informação do evento em cada notificação** - Buscar nome do evento junto com os dados
2. **Exibir badge/tag do evento** na notificação para identificação visual
3. **Adicionar filtro por evento** no painel de notificações e na Home

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useNotifications.tsx` | Incluir evento_id e nome_evento nos dados e buscar info do evento |
| `src/components/layout/NotificationsPanel.tsx` | Exibir badge do evento em cada notificação |
| `src/pages/Home.tsx` | Adicionar filtro por evento no feed de atividades |

---

## Seção Técnica

### 1. Modificar Interface Notification

```typescript
export interface Notification {
  id: string;
  type: 'viagem' | 'veiculo' | 'motorista' | 'presenca' | 'vistoria';
  action: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon: ReactNode;
  color: string;
  motorista?: string;
  placa?: string;
  eventoId?: string;       // NOVO
  eventoNome?: string;     // NOVO
}
```

### 2. Modificar Tipos de Resultado das Queries

**ViagemLogResult:**
```typescript
interface ViagemLogResult {
  id: string;
  acao: string;
  created_at: string | null;
  viagem: {
    motorista: string;
    placa: string | null;
    evento_id: string | null;
    evento: {                    // NOVO - join
      nome_planilha: string;
    } | null;
  } | null;
}
```

**PresencaLogResult:**
```typescript
interface PresencaLogResult {
  id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  updated_at: string;
  evento_id: string | null;      // NOVO
  motorista: {
    nome: string;
  } | null;
  evento: {                      // NOVO - join
    nome_planilha: string;
  } | null;
}
```

**VistoriaLogResult:**
```typescript
interface VistoriaLogResult {
  id: string;
  tipo_vistoria: string;
  status_novo: string;
  created_at: string;
  evento_id: string | null;      // NOVO
  veiculo: {
    placa: string;
  } | null;
  realizado_por_nome: string | null;
  evento: {                      // NOVO - join
    nome_planilha: string;
  } | null;
}
```

### 3. Modificar Queries no fetchNotifications

**viagem_logs:**
```typescript
supabase
  .from('viagem_logs')
  .select(`
    id,
    acao,
    created_at,
    viagem:viagens!viagem_id(
      motorista, 
      placa, 
      evento_id,
      evento:eventos!evento_id(nome_planilha)
    )
  `)
  .order('created_at', { ascending: false })
  .limit(30)
```

**motorista_presenca:**
```typescript
supabase
  .from('motorista_presenca')
  .select(`
    id,
    checkin_at,
    checkout_at,
    updated_at,
    evento_id,
    motorista:motoristas!motorista_id(nome),
    evento:eventos!evento_id(nome_planilha)
  `)
  .order('updated_at', { ascending: false })
  .limit(15)
```

**veiculo_vistoria_historico:**
```typescript
supabase
  .from('veiculo_vistoria_historico')
  .select(`
    id,
    tipo_vistoria,
    status_novo,
    created_at,
    evento_id,
    veiculo:veiculos!veiculo_id(placa),
    realizado_por_nome,
    evento:eventos!evento_id(nome_planilha)
  `)
  .order('created_at', { ascending: false })
  .limit(15)
```

### 4. Incluir Dados do Evento ao Criar Notificação

```typescript
// Para viagem logs
newNotifications.push({
  id: `viagem-${log.id}`,
  type: 'viagem',
  // ... outros campos
  eventoId: log.viagem?.evento_id || undefined,
  eventoNome: log.viagem?.evento?.nome_planilha || undefined,
});

// Para presença logs
newNotifications.push({
  id: `presenca-${log.id}`,
  type: 'presenca',
  // ... outros campos
  eventoId: log.evento_id || undefined,
  eventoNome: log.evento?.nome_planilha || undefined,
});

// Para vistoria logs
newNotifications.push({
  id: `vistoria-${log.id}`,
  type: 'vistoria',
  // ... outros campos
  eventoId: log.evento_id || undefined,
  eventoNome: log.evento?.nome_planilha || undefined,
});
```

### 5. Exibir Evento no NotificationsPanel

Na renderização do card, adicionar badge do evento:

```tsx
<div className="flex items-center gap-2">
  <p className="font-medium text-sm">{notification.title}</p>
  {notification.eventoNome && (
    <Badge variant="outline" className="text-xs">
      {notification.eventoNome}
    </Badge>
  )}
  {!notification.read && (
    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
  )}
</div>
```

### 6. Adicionar Filtro por Evento na Home

Extrair eventos únicos das notificações:

```typescript
const { motoristas, placas, eventos } = useMemo(() => {
  const motoristasSet = new Set<string>();
  const placasSet = new Set<string>();
  const eventosMap = new Map<string, string>(); // id -> nome
  
  notifications.forEach(n => {
    if (n.motorista) motoristasSet.add(n.motorista);
    if (n.placa) placasSet.add(n.placa);
    if (n.eventoId && n.eventoNome) {
      eventosMap.set(n.eventoId, n.eventoNome);
    }
  });
  
  return {
    motoristas: Array.from(motoristasSet).sort(),
    placas: Array.from(placasSet).sort(),
    eventos: Array.from(eventosMap.entries())
  };
}, [notifications]);
```

Adicionar estado e select para filtro de evento:

```typescript
const [filtroEvento, setFiltroEvento] = useState<string>('todos');

// No filter
const matchEvento = filtroEvento === 'todos' || n.eventoId === filtroEvento;

// No JSX - novo select
<Select value={filtroEvento} onValueChange={setFiltroEvento}>
  <SelectTrigger className="w-[180px]">
    <Calendar className="h-4 w-4 mr-2" />
    <SelectValue placeholder="Evento" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="todos">Todos Eventos</SelectItem>
    {eventos.map(([id, nome]) => (
      <SelectItem key={id} value={id}>{nome}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Resultado Visual

Cada notificação exibirá:
```text
┌─────────────────────────────────────────────────┐
│ 🚗  Viagem Iniciada  [Evento ABC]  ●            │
│     João Silva (ABC-1234)                       │
│     ⏰ há 2 minutos                             │
└─────────────────────────────────────────────────┘
```

E os filtros na Home incluirão:
- Motorista
- Veículo  
- **Evento** (novo)

---

## Resultado Esperado

1. Cada notificação exibe de qual evento ela pertence
2. Admins podem filtrar atividades por evento específico
3. Melhor organização quando há múltiplos eventos simultâneos
4. Identificação visual clara da origem de cada ação
