
# Corrigir notificacoes ausentes e bug de persistencia de lida/excluida

## Diagnostico

### Bug 1: Viagens de missao NAO geram log
Quando o motorista inicia uma missao (AppMotorista.tsx linhas 149-208), a viagem e criada via INSERT direto no Supabase, mas **nao chama `registrarLog`** para registrar a acao `inicio`. Da mesma forma, quando o motorista finaliza via `registrarChegada`, o log de `chegada` e registrado pelo hook, mas o log de `inicio` nunca foi criado.

A tabela `viagem_logs` esta **completamente vazia** hoje -- confirmado via query. Isso significa que NENHUMA notificacao de viagem aparece, nem na Home nem no sino.

A raiz: o fluxo de missao em `AppMotorista.tsx` cria a viagem mas nao insere nenhum `viagem_log`. O `registrarLog` so existe dentro de `useViagemOperacaoMotorista.ts`, que e chamado quando o motorista usa `iniciarViagem()` ou `registrarChegada()` -- mas o fluxo de missao nao usa essas funcoes.

### Bug 2: Notificacoes reaparecem apos marcar como lida ou excluir
O estado de leitura/exclusao e mantido apenas em memoria (useState e useRef). Quando um evento Realtime dispara `fetchNotifications()`, o sistema:
- **Read**: O `readMap` preserva lidas corretamente... mas o `fetchNotifications` e recriado quando `soundEnabled` muda (dependencia no useCallback), causando reset do closure.
- **Delete**: O `deletedIdsRef` funciona para exclusoes individuais, mas `clearAll()` nao adiciona os IDs ao ref -- apos proxima refetch, voltam todos.
- **Persistencia**: Nenhum dos dois estados persiste no localStorage, entao ao recarregar a pagina, tudo volta como nao lido.

## Correcoes

### 1. Adicionar log de inicio e encerramento no fluxo de missao

**Arquivo**: `src/pages/app/AppMotorista.tsx`

Apos criar a viagem com sucesso (depois da linha 187), inserir log de `inicio`:
```text
// Registrar log de inicio da missao
await supabase.from('viagem_logs').insert([{
  viagem_id: novaViagem.id,
  user_id: motorista.id,
  acao: 'inicio',
  detalhes: {
    via: 'app_motorista_missao',
    motorista_nome: motorista.nome,
    placa: veiculoExibir?.placa,
  }
}]);
```

### 2. Persistir estado de leitura e exclusao no localStorage

**Arquivo**: `src/hooks/useNotifications.tsx`

Substituir o sistema in-memory por persistencia no localStorage:

- **Read IDs**: Salvar Set de IDs lidos em `localStorage('notification-read-ids')`. Ao fetch, marcar como `read: true` se o ID estiver no Set.
- **Deleted IDs**: Salvar Set de IDs excluidos em `localStorage('notification-deleted-ids')`. Ao fetch, filtrar IDs excluidos. Corrigir `clearAll` para adicionar todos os IDs atuais ao Set.
- **Limpeza automatica**: Limpar IDs com mais de 24h para evitar crescimento infinito do localStorage (baseado no timestamp da notificacao).

Mudancas especificas:
1. Inicializar `readIdsRef` e `deletedIdsRef` a partir do localStorage
2. Em `markAsRead`, adicionar ID ao ref E salvar no localStorage
3. Em `markAllAsRead`, adicionar todos IDs ao ref E salvar
4. Em `deleteNotification`, ja adiciona ao ref -- adicionar persist
5. Em `clearAll`, adicionar TODOS os IDs atuais ao `deletedIdsRef` e persistir
6. Remover `soundEnabled` e `playNotificationSound` da lista de dependencias do `fetchNotifications` (usar refs) para evitar recriacao desnecessaria

### 3. Estabilizar fetchNotifications (remover dependencia de soundEnabled)

**Arquivo**: `src/hooks/useNotifications.tsx`

O `fetchNotifications` inclui `soundEnabled` e `playNotificationSound` nas dependencias do useCallback. Isso causa recriacao da funcao e re-subscribe nos canais Realtime a cada toggle de som. 

Solucao: usar `soundEnabledRef` (useRef) dentro de fetchNotifications, removendo a dependencia. Isso estabiliza a funcao e evita reconexoes desnecessarias.

## Resultado esperado

- Viagens iniciadas por missao geram notificacao "Viagem Iniciada" na Home e no sino
- Viagens finalizadas por missao geram notificacao "Chegou ao Destino" (ja funciona via hook)
- Notificacoes marcadas como lidas persistem entre refetch e reload da pagina
- Notificacoes excluidas nunca reaparecem, mesmo apos Realtime trigger
- "Limpar tudo" remove permanentemente todas as notificacoes da sessao
