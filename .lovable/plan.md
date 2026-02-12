

# Sistema de Alerta de Combustivel + Notificacoes no Header

## Resumo

Criar um fluxo completo para motoristas reportarem combustivel baixo, com alertas automaticos no CCO e no App Supervisor. Tambem mover o sino de notificacoes da sidebar para o header de todas as paginas do CCO.

## 1. Botao "Reportar Combustivel" no App do Motorista

Adicionar um botao na aba **Veiculo** (`MotoristaVeiculoTab.tsx`) que abre um modal/drawer com:
- O gauge de combustivel existente (`CombustivelGauge`) para o motorista selecionar o nivel atual
- Campo opcional de observacao (ex: "Preciso abastecer urgente")
- Botao "Enviar Alerta"

Ao confirmar:
- Atualiza `veiculos.nivel_combustivel` no Supabase
- Insere um registro em `viagem_logs` com acao `alerta_combustivel` (ou uma nova tabela dedicada - veja opcao abaixo)
- Exibe toast de confirmacao

**Nova tabela `alertas_frota`** para armazenar alertas estruturados:

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid | PK |
| evento_id | uuid | FK evento |
| veiculo_id | uuid | FK veiculo |
| motorista_id | uuid | FK motorista |
| tipo | varchar | 'combustivel_baixo' |
| nivel_combustivel | varchar | Nivel reportado |
| observacao | text | Texto livre |
| status | varchar | 'aberto', 'pendente', 'resolvido' |
| resolvido_por | uuid | Quem resolveu |
| resolvido_em | timestamptz | Quando resolveu |
| created_at | timestamptz | default now() |

Isso permite rastrear o ciclo completo: alerta -> pendente (na base) -> resolvido (abastecido e liberado).

## 2. Barra de Notificacao no Header do Supervisor

No `AppSupervisor.tsx`, adicionar um icone de sino no header (ao lado do menu de 3 pontinhos) que:
- Mostra badge com contagem de alertas abertos
- Ao clicar, abre um modal/sheet com a lista de alertas ativos
- Cada alerta mostra: placa do veiculo, nome do motorista, nivel de combustivel, tempo desde o alerta
- Acoes disponiveis por alerta:
  - **"Chamar Base"** - usa a logica existente de ChamarBaseModal para trazer o motorista
  - **"Marcar Pendente"** - atualiza status para `pendente` (veiculo na base aguardando abastecimento)
  - **"Resolver"** - marca como resolvido (veiculo abastecido e liberado)

O hook buscara alertas da tabela `alertas_frota` com Realtime subscription.

## 3. Mover Sino de Notificacoes para o Header do CCO

Atualmente o `NotificationsPanel` esta na sidebar (`MainLayout.tsx` linha 89 e `AppSidebar.tsx` - nao foi encontrado la, esta apenas no MainLayout).

Mudancas:
- **`MainLayout.tsx`**: Remover o NotificationsPanel da sidebar e adicionar um header fixo acima do conteudo com relogio + sino
- **`EventLayout.tsx`**: O header ja e renderizado dentro de cada pagina (Dashboard, Operacao, etc). Adicionar o NotificationsPanel ao componente `Header.tsx` que ja existe e ja importa o NotificationsPanel (ja esta feito!)
- **Pagina Home**: Ja usa MainLayout. Adicionar header com relogio + sino

Na pratica:
- `Header.tsx` ja tem o NotificationsPanel integrado - esta correto para paginas dentro de evento
- `MainLayout.tsx` precisa mover o sino da sidebar para um header superior inline com o conteudo

## 4. Exibir Alertas de Combustivel no CCO

### Na Home (`Home.tsx`)
- Adicionar uma secao "Alertas de Frota" que mostra alertas abertos de todos os eventos
- Cards com status colorido (vermelho = vazio/1-4, amarelo = 1/2)

### No Dashboard (`Dashboard.tsx`)
- Adicionar um card/badge dentro do painel de metricas mostrando quantidade de alertas de combustivel abertos
- Ou integrar na secao de alertas existente (`AlertsPanel`)

## 5. Integracao com Notificacoes Existentes

Adicionar o tipo `alerta_combustivel` ao sistema de notificacoes (`useNotifications.tsx`):
- Novo canal Realtime ouvindo `alertas_frota`
- Config de icone: Fuel icon, cor vermelha
- Aparece no sino do CCO e na Home

## Detalhes Tecnicos

### Arquivos novos
| Arquivo | Descricao |
|---|---|
| `src/components/app/ReportarCombustivelModal.tsx` | Modal com gauge + observacao para motorista |
| `src/hooks/useAlertasFrota.ts` | Hook para CRUD de alertas com Realtime |
| `src/components/app/SupervisorAlertasModal.tsx` | Modal de alertas no supervisor |

### Arquivos modificados
| Arquivo | Mudanca |
|---|---|
| `src/components/app/MotoristaVeiculoTab.tsx` | Adicionar botao "Reportar Combustivel" |
| `src/pages/app/AppSupervisor.tsx` | Adicionar sino de alertas no header |
| `src/components/layout/MainLayout.tsx` | Mover NotificationsPanel da sidebar para header inline |
| `src/hooks/useNotifications.tsx` | Adicionar tipo `alerta_combustivel` e canal Realtime |
| `src/pages/Home.tsx` | Exibir secao de alertas de frota |
| `src/pages/Dashboard.tsx` | Exibir contagem de alertas de combustivel |

### Migracao SQL
- Criar tabela `alertas_frota` com RLS policies permissivas (mesmo padrao das outras tabelas)

### Fluxo completo

```text
Motorista reporta combustivel baixo
  |
  v
Registro em alertas_frota (status: aberto)
+ Atualiza veiculos.nivel_combustivel
  |
  v
Realtime dispara para:
  - Supervisor: badge no sino do header
  - CCO: notificacao no sino + card na Home
  |
  v
Supervisor aciona "Chamar Base"
  -> Motorista retorna a base
  -> Supervisor marca "Pendente"
  |
  v
Veiculo abastecido
  -> Supervisor marca "Resolvido"
  -> Alerta sai da lista
```

