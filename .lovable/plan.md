

# Adicionar Role "Cliente" na Equipe + Dashboard Estrategico Aprimorado

## Visao Geral

Adicionar a opcao "Cliente" no wizard de criacao de staff na pagina Equipe, com as devidas permissoes de somente leitura. Em paralelo, aprimorar o dashboard do Cliente com KPIs compilados mais ricos (dados de veiculos, combustivel, tempos medios, etc.), mantendo a interface mobile-first e sem alertas operacionais.

## Parte 1: Adicionar "Cliente" no AddStaffWizard

### `src/components/equipe/AddStaffWizard.tsx`

- Alterar o tipo `StaffType` de `'operador' | 'supervisor'` para `'operador' | 'supervisor' | 'cliente'`
- Adicionar um terceiro card no Step 2 (Tipo de Acesso) para "Cliente":
  - Icone: `Eye` (lucide-react) 
  - Titulo: "Cliente"
  - Descricao: "Visualiza metricas estrategicas e localizacao (somente leitura)"
- Na confirmacao (Step 4), ajustar a mensagem para "Acesso ao dashboard estrategico (somente leitura)"
- A chamada a `staff-register` e `staff-login` ja suportam qualquer role via campo `role`, entao nenhuma mudanca e necessaria nas Edge Functions

### `src/pages/EventoUsuarios.tsx`

- Adicionar "Cliente" como opcao no `Select` de filtro de role (linha 425)
- Adicionar um stat card para "Clientes" na grade de stats (com icone `Eye`)
- No `getRoleIcon`: adicionar case `'cliente'` retornando icone `Eye`
- No `getRoleBadgeClass`: adicionar case `'cliente'` com cor distinta (ex: `bg-orange-500/10 text-orange-600`)

### `src/hooks/useEquipe.ts`

- Na funcao `stats`, adicionar contagem de `clientes` (filtrar por `m.role === 'cliente'`)

## Parte 2: Dashboard Estrategico Aprimorado

### `src/components/app/ClienteDashboardTab.tsx`

Reformular o dashboard para incluir KPIs compilados semelhantes ao que o Supervisor visualiza, mas sem controles operacionais. Novos indicadores:

**KPIs Principais (grid 2x3 mobile)**
1. Total PAX Dia (ja existe)
2. Viagens Realizadas (ja existe)
3. Em Transito (ja existe)
4. Tempo Medio por Viagem (ja existe)
5. **Veiculos Ativos** (novo - quantidade unica de placas em viagens ativas)
6. **Motoristas Online** (novo - usando `useMotoristasDashboard`)

**Cards de Insights Compilados (novos)**
- **Distribuicao por Tipo de Veiculo**: Mini-grafico ou badges mostrando quantas viagens por tipo (Onibus, Van, Sedan, SUV, Blindado)
- **Desempenho por Rota**: Top 3 rotas com quantidade de viagens e tempo medio (ja existe parcialmente no grafico, agora como cards resumidos)
- **Combustivel da Frota**: Buscar dados de `veiculos` do evento para mostrar nivel medio de combustivel e quantidade de veiculos por nivel (cheio, 3/4, 1/2, 1/4, reserva)
- **Horario de Pico** (ja existe)
- **Rota Mais Utilizada** (ja existe)

**Graficos (mantidos)**
- Passageiros por Hora
- Desempenho por Rota

**Dados adicionais necessarios:**
- Buscar `veiculos` do evento para metricas de frota/combustivel (query simples ao Supabase)
- Usar `useMotoristasDashboard` (ja existe) para contagem de motoristas online

### Resumo das alteracoes por arquivo

| Arquivo | Mudanca |
|---------|---------|
| `src/components/equipe/AddStaffWizard.tsx` | Adicionar opcao "Cliente" no Step 2 |
| `src/pages/EventoUsuarios.tsx` | Filtro + stat card + badge/icone para cliente |
| `src/hooks/useEquipe.ts` | Contagem de clientes nos stats |
| `src/components/app/ClienteDashboardTab.tsx` | Novos KPIs: veiculos ativos, motoristas online, distribuicao por tipo, combustivel da frota |

### Seguranca e Permissoes

- O Cliente ja esta protegido pelo `EventRoleRoute` com `allowedRoles={['cliente']}` na rota `/app/:eventoId/cliente`
- O `StaffAuthContext` ja inclui `'cliente'` no tipo `StaffRole`
- A Edge Function `staff-login` retorna o role no JWT, que e validado pelo `StaffRoute`
- O dashboard e puramente de leitura (SELECT), sem nenhuma mutacao de dados

