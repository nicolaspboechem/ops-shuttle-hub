

# Limitar Motorista a Uma Missao Ativa por Vez

## Problema

Atualmente, o CCO pode designar multiplas missoes para o mesmo motorista, e o motorista pode aceitar/iniciar varias simultaneamente. Isso causa:
- Duplicacao de status no Localizador (motorista aparece em multiplos estados)
- Queries desnecessarias (buscar viagens ativas de missoes sobrepostas)
- Confusao operacional (qual missao esta realmente ativa?)

## Solucao

Aplicar validacao no frontend para garantir que o motorista so pode ter **uma missao ativa** (aceita ou em_andamento) por vez. Novas missoes so podem ser aceitas se a anterior estiver concluida ou cancelada. Missoes pendentes continuam visiveis mas com botao bloqueado.

## Alteracoes

### 1. `src/pages/app/AppMotorista.tsx` (App do Motorista)

No `handleMissaoAction`, antes de aceitar ou iniciar:
- Verificar se ja existe uma missao com status `aceita` ou `em_andamento` na lista `missoes`
- Se existir, exibir toast de aviso: "Finalize ou cancele a missao atual antes de aceitar outra"
- Bloquear a acao

Na renderizacao dos cards, passar uma prop `disabled` para `MissaoCardMobile` quando houver outra missao ativa (aceita/em_andamento) e a missao atual for pendente. Isso desabilita o botao "Aceitar" e o swipe.

### 2. `src/components/app/MissaoCardMobile.tsx`

- Adicionar prop `disabled?: boolean` ao componente
- Quando `disabled=true` e status for `pendente`:
  - Botao "Aceitar Missao" fica desabilitado com texto "Finalize a missao atual"
  - Swipe right desabilitado
  - Card com opacidade reduzida (opacity-60)
- Missoes `aceita` e `em_andamento` continuam com acoes normais (iniciar/finalizar)

### 3. `src/hooks/useMissoes.ts` (Hook do CCO)

No `aceitarMissao` (linha 244), adicionar validacao:
- Antes de mudar status para `aceita`, verificar se ja existe missao `aceita` ou `em_andamento` para o mesmo `motorista_id` no evento
- Se existir, retornar erro com toast

No `iniciarMissao` (linha 248), mesma validacao:
- Verificar se ja existe missao `em_andamento` para o motorista
- Bloquear se houver

### Logica de validacao (reutilizavel)

```text
temMissaoAtiva = missoes.some(m =>
  m.motorista_id === motorista_id &&
  (m.status === 'aceita' || m.status === 'em_andamento') &&
  m.id !== missaoAtualId
)
```

### Resumo visual do fluxo

```text
Motorista tem missao em_andamento?
  SIM -> Bloquear aceitar/iniciar novas. Mostrar cards pendentes como "aguardando"
  NAO -> Motorista tem missao aceita?
    SIM -> Bloquear aceitar novas. Permitir iniciar a aceita
    NAO -> Permitir aceitar qualquer pendente
```

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/app/AppMotorista.tsx` | Validacao antes de aceitar/iniciar + prop disabled nos cards |
| `src/components/app/MissaoCardMobile.tsx` | Nova prop `disabled`, UI bloqueada para pendentes |
| `src/hooks/useMissoes.ts` | Validacao no CCO para aceitarMissao e iniciarMissao |

