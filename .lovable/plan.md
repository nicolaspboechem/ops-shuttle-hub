
# Padronizar Viagens e Definir Roles

## Resumo

Tres mudancas principais:
1. O App Supervisor passa a gerenciar viagens da mesma forma que o Operador (cards inline com acoes, filtros por tipo, metricas de PAX, paginacao de 10)
2. O App Motorista perde o botao "+" (Corrida) -- motorista so recebe missoes
3. Definicao clara das roles do sistema

---

## 1. Definicao de Roles

| Role | Pode criar viagens? | Pode criar missoes? | Controle de viagens | Interface |
|------|---------------------|---------------------|---------------------|-----------|
| **Admin** | Sim (CCO desktop) | Sim | Total | /evento |
| **Supervisor** | Sim (app mobile) | Sim | Total (igual Operador) | /app/supervisor |
| **Operador** | Sim (app mobile) | Sim | Total | /app/operador |
| **Motorista** | Nao | Nao (recebe) | Apenas missoes designadas | /app/motorista |
| **Cliente** | Nao | Nao | Apenas visualiza | /app/cliente |

---

## 2. App Supervisor: Aba Viagens igual ao Operador

**Problema atual**: A aba Viagens do Supervisor usa `SupervisorViagensTab` que so mostra viagens ativas com filtro de status (agendado/em_andamento/standby). Nao tem:
- Shuttle inline cards
- Filtro por tipo (Transfer/Shuttle/Missao pills)
- Metricas resumo (PAX ida/volta, total operacoes)
- Missoes ativas/finalizadas
- Cards de viagens encerradas
- Paginacao de 10

**Solucao**: Refatorar `AppSupervisor` para renderizar a aba Viagens inline (como faz o `AppOperador`) em vez de delegar ao `SupervisorViagensTab`. Isso inclui:

### Arquivos modificados:

**`src/pages/app/AppSupervisor.tsx`**
- Importar e usar os mesmos hooks do Operador: `usePaginatedList`, `LoadMoreFooter`, `useMissoes`, `useVeiculos`, `useUserNames`, `ViagemCardOperador`, `ShuttleCardOperador`, `MissaoCardMobile`, `CreateShuttleForm`, `ShuttleEncerrarModal`, `OperadorHistoricoTab`, `EditViagemMobileModal`
- Adicionar `FiltroTipoPills` (copiar do Operador ou extrair para componente compartilhado)
- Adicionar `ViagemEncerradaCard` (copiar do Operador)
- Na aba Viagens, renderizar: DiaSeletor + FiltroTipoPills + metricas resumo (grid 2x2) + missoes ativas + viagens ativas + viagens encerradas + missoes finalizadas, tudo com `usePaginatedList({ defaultPageSize: 10 })` e `LoadMoreFooter({ showPageSizeSelector: false })`
- Adicionar tab `historico` no bottom nav (igual operador) para viagens de dias anteriores
- Mover "Mais" para o header (DropdownMenu com tres pontinhos, igual ja feito no Operador)

**`src/components/app/SupervisorBottomNav.tsx`**
- Remover aba "mais"
- Adicionar aba "historico" (icone ClipboardList)
- Tabs finais: Frota | Viagens | + Nova | Localizador | Historico

---

## 3. App Motorista: Remover botao "+"

**`src/components/app/MotoristaBottomNav.tsx`**
- Remover a aba `corrida` (botao central "+") do array de tabs
- Tabs finais: Inicio | Veiculo | Historico | Mais

**`src/pages/app/AppMotorista.tsx`**
- Remover o `case 'corrida'` do `renderTabContent`
- Remover import de `CreateViagemMotoristaForm`
- Motorista continua recebendo e gerenciando missoes na aba Inicio

---

## Detalhes Tecnicos

### Supervisor - Aba Viagens (inline como Operador)

```text
Viagens tab layout:
+---------------------------+
| DiaSeletor                |
| [Todos] [Shuttle] [Transfer] [Missao]  <- FiltroTipoPills
| [Operacoes: 12] [PAX: 45]|
| [PAX Ida: 30] [PAX Volta: 15]|
|                           |
| MISSOES ATIVAS (3)        |
|  MissaoCardMobile x3      |
|  [Ver mais]               |
|                           |
| EM ANDAMENTO (5)          |
|  ViagemCardOperador x5    |
|  + botao Editar overlay   |
|  + acoes missao (concluir/cancelar)
|  [Ver mais]               |
|                           |
| ENCERRADAS (20)           |
|  ViagemEncerradaCard x10  |
|  [Ver mais]               |
|                           |
| MISSOES FINALIZADAS       |
|  MissaoCardMobile x10     |
|  [Ver mais]               |
+---------------------------+
```

### Supervisor - Header com menu "Mais"
Usar o mesmo padrao do Operador: `DropdownMenu` com tres pontinhos contendo nome do usuario, nome do evento, "Trocar Evento" e "Sair".

### Motorista - Bottom Nav simplificado

```text
Antes:  [Inicio] [Veiculo] [+Corrida] [Historico] [Mais]
Depois: [Inicio] [Veiculo] [Historico] [Mais]
```

### Arquivos alterados (resumo)
1. `src/pages/app/AppSupervisor.tsx` - aba viagens inline, header com menu, historico
2. `src/components/app/SupervisorBottomNav.tsx` - remover "mais", adicionar "historico"
3. `src/components/app/MotoristaBottomNav.tsx` - remover "corrida"
4. `src/pages/app/AppMotorista.tsx` - remover case corrida e import
