

# Backup no Localizador + Check-in/Checkout nos Cards de Motoristas + Limpeza da Equipe

## Resumo das mudancas

Tres frentes de trabalho:

1. **Badge BACKUP no Localizador**: quando um veiculo eh marcado como backup no Mapa de Servico, o card no Painel Localizador reflete isso com badge laranja e borda laranja
2. **Check-in/Checkout na aba Motoristas**: mover os controles de presenca (check-in/checkout) da aba Equipe para a aba Motoristas, em todas as visualizacoes (card, lista, kanban)
3. **Simplificar aba Equipe**: remover check-in/checkout da Equipe, mantendo apenas cadastro + login

---

## 1. Badge BACKUP no Localizador

### O que muda

O `LocalizadorCard` atualmente nao tem nenhuma indicacao de backup. Precisamos:

- Verificar se `motorista.veiculo?.observacoes_gerais` contem `[BACKUP]`
- Se sim, exibir badge "BACKUP" laranja e aplicar borda/destaque laranja ao card (mesmo visual do MapaServicoCard)

### Arquivo: `src/components/localizador/LocalizadorCard.tsx`

- Adicionar funcao `isBackup()` (mesma logica do MapaServicoCard)
- Adicionar badge laranja "BACKUP" ao lado do veiculo
- Aplicar classe `border-orange-500/50 bg-orange-500/5` ao card quando backup

### Arquivo: `src/hooks/useLocalizadorMotoristas.ts`

- Verificar se o tipo `MotoristaComVeiculo` ja inclui `observacoes_gerais` do veiculo -- se nao, incluir no select

---

## 2. Check-in/Checkout na aba Motoristas

### O que muda

Adicionar botoes de Check-in e Check-out nos cards de motorista em TODAS as 3 visualizacoes da aba Motoristas: card, lista e kanban.

### Dependencias

Reutilizar a logica de `handleCheckin` e `handleCheckout` do `useEquipe.ts`. Como o hook ja existe e funciona, vamos importar essas funcoes na pagina `Motoristas.tsx`.

### Arquivo: `src/pages/Motoristas.tsx`

- Importar `useEquipe` para ter acesso a `handleCheckin`, `handleCheckout` e dados de presenca dos motoristas
- Na view **card**: adicionar botoes Check-in / Check-out no rodape do card (abaixo do WhatsApp)
- Na view **lista**: adicionar coluna "Presenca" com botao Check-in ou indicador de presenca + botao Check-out
- Na view **kanban**: passar props de checkin/checkout para o `MotoristaKanbanCard`

### Arquivo: `src/components/motoristas/MotoristaKanbanCard.tsx`

- Adicionar props opcionais: `presenca?: { checkin_at?: string; checkout_at?: string }`, `onCheckin?: () => void`, `onCheckout?: () => void`
- Renderizar botoes de Check-in/Check-out no rodape do card (similar ao que estava na Equipe)
- Indicar visualmente quando o motorista esta presente (ring verde no card)

---

## 3. Simplificar aba Equipe

### O que muda

Remover os controles de Check-in/Check-out do `EventoUsuarios.tsx` (aba Equipe). Manter apenas:
- Cadastro de motoristas e staff
- Criacao/gerenciamento de login
- Remocao de membros
- WhatsApp

### Arquivo: `src/pages/EventoUsuarios.tsx`

- Remover o bloco de Check-in/Check-out do `MembroCard` (linhas ~232-267)
- Remover stats de "presentes" se desejar (ou manter apenas informativo)
- Manter apenas: avatar, nome, role badge, status badge, dropdown com WhatsApp/Login/Remover

---

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/components/localizador/LocalizadorCard.tsx` | Adicionar badge BACKUP + borda laranja |
| `src/hooks/useLocalizadorMotoristas.ts` | Garantir que `observacoes_gerais` vem no select do veiculo |
| `src/pages/Motoristas.tsx` | Importar useEquipe, adicionar checkin/checkout em card/lista/kanban |
| `src/components/motoristas/MotoristaKanbanCard.tsx` | Adicionar props e UI de checkin/checkout |
| `src/pages/EventoUsuarios.tsx` | Remover controles de checkin/checkout |

