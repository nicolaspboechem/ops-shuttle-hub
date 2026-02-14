

# Operador Exclusivo Shuttle + Limpeza e Otimizacao

## Resumo

O operador de campo passa a ter funcao exclusiva: registrar viagens shuttle. Todo o fluxo antigo (CreateViagemForm, NewActionModal, MissaoInstantanea, cadastro de motorista/veiculo) sera removido do AppOperador. O botao "+" abre diretamente o CreateShuttleForm. Hooks desnecessarios (useMotoristas, useVeiculos, useMissoes) serao removidos para reduzir queries no dispositivo do operador.

## Alteracoes

### 1. AppOperador (`src/pages/app/AppOperador.tsx`) -- Reescrita significativa

**Remover imports e componentes:**
- `CreateViagemForm` -- nao cria mais viagens genericas
- `NewActionModal` -- nao precisa escolher tipo, so faz shuttle
- `MissaoInstantaneaModal` -- operador nao cria missoes
- `CreateMotoristaWizard` -- operador nao cadastra motoristas
- `CreateVeiculoWizard` -- operador nao cadastra veiculos
- `VeiculoKmModal` -- operador nao registra KM
- `useMotoristas`, `useVeiculos`, `useMissoes`, `usePontosEmbarque` (usado pelo CreateShuttleForm internamente)
- `useTutorial`, `TutorialPopover` -- tutorial do fluxo antigo
- `NavigationModal` -- operador shuttle nao precisa de navegacao GPS

**Remover estados:**
- `showForm`, `showMotoristaForm`, `showVeiculoForm`, `showKmModal`, `showActionModal`, `showMissaoInstantanea`, `preselectedTipo`
- `navModalOpen`, `navModalData`

**Manter:**
- `showShuttleForm` -- unico formulario
- `useViagens` -- listar viagens shuttle do dia
- `ViagemCardOperador` -- exibir cards das viagens
- `OperadorHistoricoTab` -- historico de viagens
- Tabs: viagens, historico, mais (remover "motoristas")

**Botao "+":**
- Em vez de abrir `NewActionModal`, abre diretamente `setShowShuttleForm(true)`

### 2. OperadorBottomNav (`src/components/app/OperadorBottomNav.tsx`)

Remover a tab "motoristas". Ficam 4 tabs: **Viagens | Nova (+) | Historico | Mais**

Layout passa de 5 para 4 botoes.

### 3. OperadorMaisTab (`src/components/app/OperadorMaisTab.tsx`)

Remover botoes:
- "Cadastrar Motorista" (onCadastrarMotorista)
- "Cadastrar Veiculo" (onCadastrarVeiculo)
- "Registrar KM" (onRegistrarKm)
- Card de navegacao (onOpenNavigation)

Manter: Perfil, Suporte, Logout, versao.

Simplificar props removendo callbacks desnecessarios.

### 4. AddStaffWizard (`src/components/equipe/AddStaffWizard.tsx`)

Atualizar descricao do Operador de:
- "Gerencia viagens, motoristas e veiculos no CCO"
- Para: "Registra viagens shuttle no campo"

### 5. NewActionModal (`src/components/app/NewActionModal.tsx`)

Nenhuma alteracao necessaria -- o componente continua existindo para uso no AppSupervisor. Apenas nao sera mais importado no AppOperador.

### 6. CreateShuttleForm (`src/components/app/CreateShuttleForm.tsx`)

Trocar `useAuth` por `useCurrentUser` para funcionar com o Custom JWT do staff (StaffAuthContext). O operador faz login via /login/equipe, entao `useAuth().user` pode ser null. Usar `useCurrentUser().userId` que ja resolve qualquer contexto de auth.

### 7. Limpeza de codigo morto

- Verificar se `OperadorMotoristasTab` e importado em outro lugar. Se nao, pode ser deletado futuramente (nao bloqueia este PR).

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/app/AppOperador.tsx` | Remover fluxo antigo, manter so shuttle |
| `src/components/app/OperadorBottomNav.tsx` | Remover tab motoristas (5 -> 4 tabs) |
| `src/components/app/OperadorMaisTab.tsx` | Remover acoes de cadastro |
| `src/components/app/CreateShuttleForm.tsx` | Trocar useAuth por useCurrentUser |
| `src/components/equipe/AddStaffWizard.tsx` | Atualizar descricao do papel operador |

## Impacto nas queries por dispositivo

**Antes (operador carregava):**
- useViagens (viagens)
- useMotoristas (motoristas)
- useVeiculos (veiculos)
- useMissoes (missoes)
- usePontosEmbarque (pontos)
- useLocalizadorMotoristas (via OperadorMotoristasTab)
= 6 subscricoes Realtime + 6 queries iniciais

**Depois (operador carrega):**
- useViagens (viagens)
- usePontosEmbarque (dentro do CreateShuttleForm, so quando abre o drawer)
= 1 subscricao Realtime + 1 query inicial (+ 1 sob demanda)

Reducao de ~80% na carga de rede do dispositivo do operador.

