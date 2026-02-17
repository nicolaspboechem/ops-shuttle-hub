
# Correcao de 6 Bugs - Plano por Etapas

## Etapa 1: Re-vistoria falha na liberacao

**Problema**: Ao fazer re-vistoria pelo app supervisor, o status do veiculo nao atualiza para "liberado".

**Causa raiz**: No `VistoriaVeiculoWizard.tsx` (linha 218), o update define `liberado_em: statusFinal === 'liberado' ? getAgoraSync().toISOString() : null`. Porem, o campo `liberado_por` recebe `realizadoPorId`, que vem do `useCurrentUser()`. Para supervisores autenticados via Staff JWT, o `userId` pode nao corresponder ao UUID esperado pelo banco, ou o update silenciosamente falha porque o campo `liberado_por` espera um UUID valido de `auth.users`.

**Correcao**: No bloco de re-vistoria (linha 187-225), adicionar tratamento de erro explicito no update e garantir que `liberado_por` e `inspecao_por` aceitam o ID do staff corretamente. Tambem logar o erro caso o update falhe.

**Arquivo**: `src/components/app/VistoriaVeiculoWizard.tsx`

**Como testar**: Fazer uma re-vistoria no app supervisor, selecionar "Liberado" no ultimo passo, confirmar. Verificar se o status do veiculo muda para "liberado" na lista.

---

## Etapa 2: Supervisor precisa encerrar missoes

**Problema**: O app supervisor nao tem botao para encerrar/concluir missoes.

**Causa raiz**: O `AppSupervisor.tsx` importa `useMissoes` que tem `concluirMissao` e `cancelarMissao`, mas essas funcoes nao sao passadas para nenhum componente de UI no app supervisor. As viagens na tab de viagens nao expoem acoes de missao.

**Correcao**: Adicionar no `AppSupervisor.tsx` a capacidade de concluir e cancelar missoes. Isso sera feito passando as funcoes `concluirMissao` e `cancelarMissao` do hook `useMissoes` para o componente `SupervisorViagensTab`, que podera exibir um botao de acao nas viagens vinculadas a missoes (`origem_missao_id`).

**Arquivos**: 
- `src/pages/app/AppSupervisor.tsx` - expor funcoes de missao
- `src/components/app/SupervisorViagensTab.tsx` - adicionar botoes de acao para missoes
- `src/components/app/ViagemCardOperador.tsx` - adicionar botao "Encerrar Missao" quando viagem tem `origem_missao_id`

**Como testar**: No app supervisor, na aba Viagens, encontrar uma viagem vinculada a uma missao em andamento. Deve aparecer opcao de encerrar a missao. Ao encerrar, a viagem e a missao devem ser finalizadas.

---

## Etapa 3: CCO checkout nao desvincula veiculo (historico)

**Problema**: Ao fazer checkout pelo painel CCO (pagina Motoristas), o veiculo e desvinculado bidirecionalmente (motoristas.veiculo_id = null, veiculos.motorista_id = null), POREM nao registra a desvinculacao no historico (`veiculo_vistoria_historico`).

**Causa raiz**: O `handleCheckout` no `useEquipe.ts` (linhas 248-261) faz as 3 operacoes em paralelo (update presenca, update motorista, update veiculo), mas NAO insere registro de desvinculacao no `veiculo_vistoria_historico`. Diferente do checkout do motorista (`useMotoristaPresenca.ts` linhas 321-353) que insere o registro corretamente.

**Correcao**: Adicionar no `handleCheckout` do `useEquipe.ts` a insercao do registro de desvinculacao no `veiculo_vistoria_historico`, similar ao que ja e feito no checkout do motorista. Precisa buscar o `veiculo_id` do motorista antes de limpar.

**Arquivo**: `src/hooks/useEquipe.ts`

**Como testar**: No CCO (pagina Motoristas), fazer checkout de um motorista que tem veiculo vinculado. Verificar na auditoria de veiculos que aparece um registro de desvinculacao com "CCO (checkout)".

---

## Etapa 4: Veiculos orfaos de dias anteriores

**Problema**: Motoristas que fizeram checkout em dias anteriores ainda aparecem com veiculos vinculados no dia seguinte, porque o auto-checkout foi desativado.

**Causa raiz**: Com o auto-checkout desativado, se um motorista nao fizer checkout explicitamente, o vinculo `motoristas.veiculo_id` e `veiculos.motorista_id` permanecem. No dia seguinte, aparecem como vinculados mesmo sem estar em servico.

**Correcao**: Na edge function `close-open-trips` (que ja roda via cron para fechar viagens orfas), adicionar logica para desvinculacao de veiculos de motoristas que NAO tem presenca ativa no dia operacional atual. A funcao ja percorre todos os eventos ativos e calcula o dia operacional.

**Arquivo**: `supabase/functions/close-open-trips/index.ts`

**Como testar**: Verificar se apos a virada do dia, motoristas sem checkin ativo perdem o vinculo com o veiculo. Pode-se chamar a funcao manualmente: `supabase.functions.invoke('close-open-trips')`.

---

## Etapa 5: Missao de deslocamento nao finaliza no app

**Problema**: Missoes de deslocamento nao podem ser finalizadas pelo app do motorista.

**Causa raiz**: Missoes de deslocamento sao criadas pelo CCO/Supervisor com o fluxo `createMissao` + `aceitarMissao` + `iniciarMissao` em sequencia (em `useMissoes.ts`). O `iniciarMissao` cria a viagem e salva o `viagem_id` na missao. Porem, o `useMissoesPorMotorista` busca as missoes e carrega `viagem_id`, mas o estado local `missoes` no `AppMotorista` pode estar desatualizado no momento da finalizacao (o `viagem_id` ainda e null no estado local porque o realtime nao atualizou a tempo). 

Na logica de `finalizar` (linha 351), se `missao.viagem_id` for null, a viagem nao e encerrada - mas a missao sim. A viagem fica "em_andamento" eternamente.

**Correcao**: No bloco `finalizar` do `handleMissaoAction` no `AppMotorista.tsx`, buscar a missao atualizada do banco antes de usar `viagem_id`. Se `viagem_id` estiver null no estado local, fazer um `select` para buscar o valor real.

**Arquivo**: `src/pages/app/AppMotorista.tsx`

**Como testar**: Criar uma missao de deslocamento pelo CCO/Supervisor. No app do motorista, clicar em "Finalizar Missao". A missao e a viagem vinculada devem ser encerradas.

---

## Etapa 6: Missao cancelada atualiza localizacao para destino

**Problema**: Ao cancelar uma missao, o sistema atualiza a localizacao do motorista para o ponto de desembarque da missao, mesmo ele nunca tendo chegado la.

**Causa raiz**: A funcao `syncMotoristaAoEncerrarMissao` no `useMissoes.ts` (linhas 452-456) atualiza `ultima_localizacao` para `missao.ponto_desembarque` independentemente de ser conclusao ou cancelamento. Essa funcao e chamada tanto por `concluirMissao` quanto por `cancelarMissao`.

A mesma logica errada existe no `AppMotorista.tsx` no bloco `finalizar` (linhas 383-392) e no bloco `recusar` (que chama apenas update de status, sem localizacao - correto).

**Correcao**: 
1. No `cancelarMissao` do `useMissoes.ts`: chamar uma versao modificada que NAO atualiza localizacao. Separar a logica de `syncMotoristaAoEncerrarMissao` para aceitar um parametro `atualizarLocalizacao: boolean`.
2. No `AppMotorista.tsx`, no bloco `recusar`: ja esta correto (nao atualiza localizacao).

**Arquivo**: `src/hooks/useMissoes.ts`

**Como testar**: Criar uma missao, aceitar, iniciar e depois cancelar pelo CCO. Verificar que a localizacao do motorista NAO muda para o destino da missao.

---

## Resumo de Arquivos

| Etapa | Arquivo | Bug |
|-------|---------|-----|
| 1 | `src/components/app/VistoriaVeiculoWizard.tsx` | Re-vistoria nao libera |
| 2 | `src/pages/app/AppSupervisor.tsx`, `SupervisorViagensTab.tsx`, `ViagemCardOperador.tsx` | Supervisor sem encerrar missao |
| 3 | `src/hooks/useEquipe.ts` | CCO checkout sem historico |
| 4 | `supabase/functions/close-open-trips/index.ts` | Veiculos orfaos |
| 5 | `src/pages/app/AppMotorista.tsx` | Deslocamento nao finaliza |
| 6 | `src/hooks/useMissoes.ts` | Cancelar missao altera localizacao |

## Ordem de Implementacao

Recomendo implementar nesta ordem para que cada etapa possa ser testada isoladamente:

1. **Etapa 6** (menor risco, correcao pontual em `useMissoes.ts`)
2. **Etapa 3** (correcao pontual em `useEquipe.ts`)
3. **Etapa 1** (correcao no wizard de vistoria)
4. **Etapa 5** (correcao no app motorista)
5. **Etapa 2** (nova funcionalidade no app supervisor)
6. **Etapa 4** (alteracao na edge function)
