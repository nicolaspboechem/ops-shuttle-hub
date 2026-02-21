
# Corrigir slow resource no CCO (Viagens Ativas/Finalizadas + Motoristas)

## Problemas identificados

### 1. useUserNames - Loop infinito de re-renders (CRITICO)

**Arquivo:** `src/hooks/useUserNames.ts`

O callback `fetchNames` tem `names` na lista de dependencias (linha 48). Quando `setNames` e chamado, `names` muda, o que recria `fetchNames`, que dispara o `useEffect` novamente. Mesmo com o early return (`idsToFetch.length === 0`), o efeito dispara desnecessariamente a cada mudanca de estado, causando cascata de re-renders em todos os componentes que usam o hook.

**Correcao:** Usar `useRef` para o cache de nomes em vez de `useState`, e remover `names` das dependencias do `fetchNames`. Usar um counter de estado apenas para forcar re-render quando novos nomes sao carregados.

```text
const namesRef = useRef<UserNameCache>({});
const [version, setVersion] = useState(0);

const fetchNames = useCallback(async () => {
  const validIds = userIds.filter((id): id is string => !!id);
  const uniqueIds = [...new Set(validIds)];
  const idsToFetch = uniqueIds.filter(id => !namesRef.current[id]);
  if (idsToFetch.length === 0) return;

  // ... fetch ...
  data?.forEach(profile => {
    namesRef.current[profile.user_id] = profile.full_name || 'Usuario';
  });
  idsToFetch.forEach(id => {
    if (!namesRef.current[id]) namesRef.current[id] = 'Usuario';
  });
  setVersion(v => v + 1); // trigger re-render
}, [userIds]); // SEM 'names' nas deps
```

### 2. Pagina Motoristas carrega TODAS as viagens do evento (ALTO IMPACTO)

**Arquivo:** `src/pages/Motoristas.tsx` (linha 64)

`useViagens(eventoId)` sem filtro de `dataOperacional` carrega todas as viagens do evento inteiro. Para um evento com centenas/milhares de viagens, isso e muito pesado e desnecessario - as metricas de motorista devem ser do dia operacional atual.

**Correcao:** Adicionar filtro de dia operacional, igual ao Dashboard:

```text
const { getAgoraSync } = useServerTime();
const evento = eventoId ? getEventoById(eventoId) : null;

const viagensOptions = useMemo(() => ({
  dataOperacional: getDataOperacional(getAgoraSync(), evento?.horario_virada_dia || '04:00'),
  horarioVirada: evento?.horario_virada_dia || '04:00',
}), [evento?.horario_virada_dia]);

const { viagens, loading: loadingViagens, refetch } = useViagens(eventoId, viagensOptions);
```

### 3. Serializar userIds para estabilizar referencia

**Arquivo:** `src/hooks/useUserNames.ts`

O array `userIds` muda de referencia a cada render mesmo quando o conteudo e o mesmo. Usar `JSON.stringify` para estabilizar o efeito:

```text
const serializedIds = JSON.stringify(userIds);

useEffect(() => {
  fetchNames();
}, [serializedIds]); // em vez de [fetchNames]
```

## Resumo de arquivos

| Arquivo | Alteracao | Impacto |
|---|---|---|
| `src/hooks/useUserNames.ts` | useRef para cache + remover dep ciclica | Elimina loop de re-renders |
| `src/pages/Motoristas.tsx` | Adicionar filtro dataOperacional ao useViagens | Reduz volume de dados em ~90% |
