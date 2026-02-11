

# Mostrar nome real do usuario nos historicos de acoes

## Problema

Quando supervisores (ou outros staff de campo) realizam acoes como vistorias, desvincular veiculos ou iniciar viagens, o nome exibido nos logs aparece como "Sistema" em vez do nome real do usuario.

### Causa raiz

Existem dois problemas combinados:

1. **Componentes usam apenas `useAuth()` (Supabase Auth)**: Supervisores logam via JWT customizado (`staff-login`), mas os componentes (CreateViagemForm, VistoriaVeiculoWizard, etc.) tentam obter o usuario via `useAuth()`, que retorna `null` para staff. Resultado: `user_id` fica undefined nos logs.

2. **LogsPanel depende de join com `profiles`**: O painel tenta fazer `profiles!user_id(full_name)`, mas nao existe FK entre `viagem_logs.user_id` e `profiles`, e para motoristas o `user_id` e um ID da tabela `motoristas` (nao existe em `profiles`).

## Solucao

Abordagem pragmatica: **armazenar o nome do ator diretamente nos logs** no momento da insercao, e usar esse nome na exibicao.

### 1. Criar hook utilitario `useCurrentUser`

Um hook simples que unifica os 3 contextos de auth e retorna id + nome do usuario atual:

```text
useCurrentUser() -> { userId, userName }
  - Tenta useAuth() (admin/CCO)
  - Tenta useStaffAuth() (supervisor/operador)
  - Tenta useDriverAuth() (motorista)
  - Retorna o primeiro que estiver autenticado
```

### 2. Atualizar pontos de insercao de logs

Em todos os arquivos que inserem em `viagem_logs`, garantir que `detalhes` inclua o campo `nome_usuario`:

| Arquivo | Contexto atual | Mudanca |
|---------|---------------|---------|
| `useViagemOperacao.ts` | `useAuth()` | Adicionar `nome_usuario` em detalhes (buscar do profile) |
| `useViagemOperacaoMotorista.ts` | `useDriverAuth()` | Ja tem `motorista_nome` - padronizar para `nome_usuario` |
| `CreateViagemForm.tsx` | `useAuth()` | Usar `useCurrentUser` para pegar nome |
| `RetornoViagemForm.tsx` | `useAuth()` | Usar `useCurrentUser` para pegar nome |
| `VistoriaVeiculoWizard.tsx` | `useAuth()` | Usar `useCurrentUser` para nome no historico |

### 3. Atualizar LogsPanel para exibir nome correto

```text
Prioridade de resolucao do nome:
1. log.profile?.full_name (join com profiles - funciona para admins)
2. log.detalhes?.nome_usuario (campo armazenado no momento da acao)
3. log.detalhes?.motorista_nome (fallback para logs antigos de motorista)
4. "Sistema" (ultimo recurso)
```

### 4. Atualizar VistoriaVeiculoWizard para staff auth

O wizard de vistoria tambem precisa funcionar com staff auth para preencher `realizado_por` e `realizado_por_nome` corretamente no `veiculo_vistoria_historico`.

## Arquivos modificados

1. **Novo**: `src/hooks/useCurrentUser.ts` - Hook utilitario
2. **Editar**: `src/hooks/useViagemOperacao.ts` - Incluir nome em detalhes
3. **Editar**: `src/hooks/useViagemOperacaoMotorista.ts` - Padronizar campo nome
4. **Editar**: `src/components/app/CreateViagemForm.tsx` - Usar useCurrentUser
5. **Editar**: `src/components/app/RetornoViagemForm.tsx` - Usar useCurrentUser
6. **Editar**: `src/components/app/VistoriaVeiculoWizard.tsx` - Usar useCurrentUser
7. **Editar**: `src/components/operacao/LogsPanel.tsx` - Ler nome dos detalhes
8. **Editar**: `src/hooks/useNotifications.tsx` - Ler nome dos detalhes (se aplicavel)

## Sem alteracoes no banco de dados

O nome sera armazenado dentro do campo JSON `detalhes` que ja existe em `viagem_logs`. Nenhuma migration necessaria.

## Resultado esperado

- Acao feita por admin CCO: mostra "Fulano Admin"
- Acao feita por supervisor de campo: mostra "Supervisor João"
- Acao feita por motorista: mostra "Motorista Carlos"
- Logs antigos sem nome: continua mostrando "Sistema"

