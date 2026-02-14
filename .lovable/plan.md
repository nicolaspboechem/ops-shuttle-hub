

# Estado Atual do Fluxo Operador + Otimizacoes Pendentes

## Como esta funcionando agora

O fluxo do operador esta bem estruturado e focado exclusivamente em shuttle:

1. **Login**: Operador acessa `/login/equipe`, recebe Custom JWT via `StaffAuthContext`
2. **Tela principal** (`AppOperador`): Lista viagens do evento com filtros por status e dia operacional
3. **Criar shuttle**: Botao "+" abre `CreateShuttleForm` (Drawer) com campos minimos (embarque, desembarque, PAX, horario)
4. **Ciclo de vida**: `ViagemCardOperador` com swipe gestures -- Iniciar > Chegada > Retorno/Encerrar
5. **Auth**: `useViagemOperacaoStaff` usa `useCurrentUser()` (compativel com Custom JWT), sem logs em `viagem_logs`
6. **Notificacoes**: Filtro `motorista !== 'Shuttle'` impede shuttle de aparecer no painel CCO

## Problemas Identificados

### 1. Hook desnecessario instanciado (desperdicio de recursos)

`ViagemCardOperador` (linha 87) **sempre** chama `useViagemOperacao()` mesmo quando recebe `operacoes` via prop:

```
const defaultOps = useViagemOperacao();
const ops = operacoes || defaultOps;
```

Isso significa que no AppOperador, cada card instancia `useViagemOperacao` (que usa `useAuth()` e retorna userId=null), desperdicando ciclos de render. Em React, hooks sao executados incondicionalmente -- nao ha como evitar a chamada.

**Solucao**: Condicionar o import do hook default. Como hooks nao podem ser condicionais, a melhor abordagem e tornar `operacoes` obrigatoria e remover o fallback, OU criar `ViagemCardOperadorShuttle` sem o import do hook padrao.

### 2. useViagens carrega TODAS as viagens do evento

O operador so trabalha com shuttle, mas `useViagens` carrega transfers, missoes e shuttles. Isso inclui dados desnecessarios e aumenta o payload.

**Solucao**: Adicionar filtro `tipo_operacao=eq.shuttle` na query quando usado pelo operador. Pode ser via parametro opcional no hook.

### 3. Anti-pattern: navigate() dentro do render

Linha 126-128 do `AppOperador`:
```
if (!staffSession) {
  navigate('/login/equipe');
  return null;
}
```

Chamar `navigate()` durante o render e um anti-pattern do React que pode causar warnings. Deveria estar dentro de um `useEffect`.

### 4. Calculo de counts/filteredViagens/sortedViagens sem memoizacao

`counts`, `filteredViagens` e `sortedViagens` sao recalculados em cada render. Com dezenas de viagens, isso e negligivel, mas e uma boa pratica memoizar.

### 5. Componente orfao: `OperadorMotoristasTab`

O arquivo `src/components/app/OperadorMotoristasTab.tsx` nao e importado em nenhum lugar apos a limpeza. E codigo morto que pode ser deletado.

### 6. CreateShuttleForm usa `new Date()` em vez de `getAgoraSync()`

Linha 63: `h_inicio_real: new Date().toISOString()` -- deveria usar o horario sincronizado do servidor para consistencia com o resto do sistema.

## Plano de Otimizacao

### 1. Eliminar hook desperdicado no ViagemCardOperador

Tornar `operacoes` obrigatoria no `ViagemCardOperador` e remover o import/instanciacao de `useViagemOperacao` do componente. Todos os consumidores (AppOperador, AppSupervisor, etc.) ja passam ou passarao o hook adequado.

**Alternativa mais segura**: Manter o fallback, mas checar se `AppSupervisor` e outros consumidores ja passam `operacoes`. Se nao, atualiza-los antes.

### 2. Filtrar viagens por tipo_operacao no hook

Adicionar parametro opcional `tipoOperacao?: string` ao `useViagens` e ao Realtime filter. No `AppOperador`, passar `tipoOperacao: 'shuttle'`.

### 3. Corrigir navigate anti-pattern

Mover a verificacao de sessao para um `useEffect` com redirect, em vez de chamar navigate dentro do render.

### 4. Memoizar calculos derivados

Envolver `counts`, `filteredViagens` e `sortedViagens` em `useMemo`.

### 5. Deletar componente orfao

Remover `src/components/app/OperadorMotoristasTab.tsx`.

### 6. Usar getAgoraSync no CreateShuttleForm

Importar `useServerTime` e usar `getAgoraSync()` em vez de `new Date()`.

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/app/ViagemCardOperador.tsx` | Tornar `operacoes` obrigatoria, remover fallback `useViagemOperacao` |
| `src/hooks/useViagens.ts` | Adicionar filtro opcional `tipoOperacao` na query e no Realtime |
| `src/pages/app/AppOperador.tsx` | Passar `tipoOperacao: 'shuttle'`, memoizar counts/sorted, corrigir navigate |
| `src/components/app/CreateShuttleForm.tsx` | Usar `getAgoraSync()` em vez de `new Date()` |
| `src/components/app/OperadorMotoristasTab.tsx` | **Deletar** (codigo morto) |

## Impacto

- **Rede**: Payload do operador reduzido (so shuttle em vez de todas as viagens)
- **CPU**: Menos hooks instanciados por card, calculos memoizados
- **Consistencia**: Horarios sempre sincronizados com servidor
- **Codigo**: Menos arquivo orfao, menos anti-patterns

