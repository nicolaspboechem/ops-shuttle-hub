
# Corrigir Fluxo Operador Shuttle: Backend, Auth e Notificacoes

## Problema Identificado

O hook `useViagemOperacao` usa `useAuth()` (Supabase Auth), mas o operador faz login via Custom JWT (`StaffAuthContext`). Isso faz com que `user` seja `null`, causando:

1. **Todas as acoes do operador falham** com "Voce precisa estar logado" -- iniciar viagem, registrar chegada, encerrar, cancelar e iniciar retorno nao funcionam
2. **Nenhum log e gerado** em `viagem_logs`, pois `registrarLog` retorna silenciosamente quando `user` e null
3. **Os campos de auditoria** (`iniciado_por`, `finalizado_por`, `atualizado_por`) ficam vazios

## Solucao

### 1. Criar `useViagemOperacaoStaff` (novo hook)

Criar `src/hooks/useViagemOperacaoStaff.ts` -- versao do `useViagemOperacao` que usa `useCurrentUser` em vez de `useAuth`. Este hook:

- Usa `useCurrentUser()` para obter `userId` e `userName` (funciona com qualquer contexto de auth)
- Implementa as mesmas operacoes: `iniciarViagem`, `registrarChegada`, `encerrarViagem`, `cancelarViagem`, `iniciarRetorno`
- **NAO registra logs em `viagem_logs`** para viagens shuttle (conforme solicitado -- shuttle nao gera notificacoes)
- Simplifica a logica removendo atualizacao de status/localizacao de motorista (shuttle usa `motorista: 'Shuttle'`, nao tem motorista real)

### 2. Atualizar `ViagemCardOperador`

Alterar `src/components/app/ViagemCardOperador.tsx` para aceitar uma prop opcional que determina qual hook de operacao usar:

- Adicionar prop `useStaffAuth?: boolean`
- Quando `true`, usar `useViagemOperacaoStaff` em vez de `useViagemOperacao`

**Alternativa mais limpa**: Criar um wrapper `ViagemCardOperadorShuttle` que use o hook correto, ou fazer o `ViagemCardOperador` detectar o contexto automaticamente.

A abordagem escolhida: modificar `ViagemCardOperador` para aceitar o hook de operacao como prop injetada a partir do `AppOperador`.

### 3. Filtrar Notificacoes Shuttle

Alterar `src/hooks/useNotifications.tsx` para excluir viagens shuttle das notificacoes:

- Na query de `viagem_logs`, fazer JOIN com `viagens` e filtrar `tipo_operacao != 'shuttle'` (ja faz JOIN, basta adicionar filtro)
- Ou filtrar no client-side apos receber os dados, removendo notificacoes onde `motorista === 'Shuttle'`

A abordagem mais robusta: filtrar no client-side verificando se `motoristaNome === 'Shuttle'` (simples e nao requer mudanca na query).

## Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useViagemOperacaoStaff.ts` | **Novo** -- hook de operacao compativel com Staff JWT, sem logs |
| `src/components/app/ViagemCardOperador.tsx` | Aceitar hook de operacao injetado ou detectar contexto |
| `src/pages/app/AppOperador.tsx` | Passar configuracao para usar hook staff |
| `src/hooks/useNotifications.tsx` | Filtrar notificacoes de viagens shuttle |

## Detalhes Tecnicos

### useViagemOperacaoStaff

```text
useCurrentUser() -> { userId, userName }

iniciarViagem(viagem):
  - update viagens set status='em_andamento', iniciado_por=userId, h_inicio_real=now
  - SEM registrarLog (shuttle nao notifica)

registrarChegada(viagem, qtdPax, aguardarRetorno):
  - update viagens set status, h_chegada, finalizado_por, encerrado, qtd_pax
  - SEM atualizarStatusMotorista (shuttle nao tem motorista real)

encerrarViagem(viagem):
  - update viagens set status='encerrado', encerrado=true, finalizado_por=userId

cancelarViagem(viagem):
  - update viagens set status='cancelado', encerrado=true

iniciarRetorno(viagemOriginal):
  - insert nova viagem com origem/destino invertidos
  - update viagem original para encerrado
```

### Filtro de Notificacoes

Na funcao `fetchNotifications`, ao processar `viagemLogs`, adicionar filtro:

```text
viagemLogs
  .filter(log => log.viagem?.motorista !== 'Shuttle')
  .forEach(...)
```

Isso garante que mesmo que logs de shuttle existam no banco (criados por outro contexto), eles nao aparecem no painel de notificacoes.

## Resultado Esperado

- Operador consegue criar shuttle (ja funciona) E gerenciar o ciclo de vida (iniciar, chegada, encerrar, retorno, cancelar)
- Viagens shuttle aparecem corretamente no dashboard CCO na aba Shuttle
- Notificacoes de shuttle NAO aparecem no painel de notificacoes
- Campos de auditoria (`criado_por`, `iniciado_por`, `finalizado_por`) preenchidos com o user_id do staff
