
# Ajustar Dashboard Shuttle e Visibilidade do Localizador

## Diagnostico

### Problema 1: Veiculos cadastrados nao aparecem no dashboard de shuttle
O `ShuttleMetrics` (CCO) exibe apenas PAX e contagem de viagens. Nao mostra quantos veiculos estao cadastrados ou em operacao. O `ClienteDashboardTab` conta "Veiculos Ativos" a partir de placas em viagens ativas, mas shuttles frequentemente nao tem `veiculo_id` preenchido, resultando em contagem zero.

### Problema 2: Metricas de motorista irrelevantes para shuttle
O dashboard do cliente mostra "Motoristas Online" usando o sistema de presenca (`motorista_presenca`), mas operacoes shuttle nao usam motoristas cadastrados -- usam o texto generico "Shuttle". Essas metricas ficam zeradas e confundem.

### Problema 3: Localizador ja esta condicionalmente visivel (OK)
O codigo em `AppCliente.tsx` (linha 55) ja verifica `evento?.habilitar_localizador` antes de adicionar a aba. Tanto o `ClienteBottomNav` quanto o `ClienteHeaderNav` usam `availableTabs` para filtrar. **Isso ja funciona corretamente** -- nenhuma mudanca necessaria.

### Problema 4: Auditoria de shuttle ja funciona (OK)
A pagina `Auditoria.tsx` usa `OperationTabs` com filtro por tipo de operacao. Ao selecionar "Shuttle", todas as abas (Resumo, Motoristas, Veiculos, Abastecimento) ja filtram por `tipo_operacao === 'shuttle'`. **Funciona corretamente**.

## Mudancas propostas

### 1. Adicionar contagem de veiculos ao `ShuttleMetrics` (CCO)

**Arquivo:** `src/components/shuttle/ShuttleMetrics.tsx`

Adicionar um novo KPI card mostrando:
- **Veiculos em Operacao**: contagem de `veiculo_id` unicos nas viagens ativas do shuttle
- Subtitle mostrando total de veiculos cadastrados no evento (recebido via nova prop `totalVeiculos`)

O componente passara a receber uma prop opcional `totalVeiculos` para contextualizar (ex: "3 de 8 na frota").

### 2. Adaptar `ClienteDashboardTab` para operacao shuttle

**Arquivo:** `src/components/app/ClienteDashboardTab.tsx`

Detectar o tipo de operacao dominante do evento (via `tipos_viagem_habilitados`). Quando o evento for predominantemente shuttle:

- **Secao "Operacao Agora"**: Substituir "Motoristas Online" por "Veiculos na Frota" (total de veiculos cadastrados). Manter "Veiculos Ativos" contando veiculos em viagens ativas.
- **Secao "Consolidado"**: Manter como esta (PAX total, viagens finalizadas, tempo medio).
- Buscar `tipos_viagem_habilitados` do evento para determinar se deve mostrar metricas de motorista ou de frota.

Mudancas tecnicas:
- Buscar `tipos_viagem_habilitados` junto com a query do evento (ja existe no `AppCliente.tsx`, so precisa propagar como prop)
- Condicionar a renderizacao do card "Motoristas Online" vs "Veiculos na Frota" baseado no tipo habilitado

### 3. Propagar `tipos_viagem_habilitados` para o dashboard do cliente

**Arquivo:** `src/pages/app/AppCliente.tsx`

Adicionar `tipos_viagem_habilitados` a query de busca do evento e propagar como prop para `ClienteDashboardTab`.

### 4. Passar `totalVeiculos` para `ShuttleMetrics` no CCO

**Arquivo:** `src/components/eventos/EventoTabs.tsx`

Receber e propagar a contagem de veiculos do evento para o `ShuttleMetrics`. O componente pai (`EventLayout` ou a pagina que monta `EventoTabs`) ja tem acesso ao `eventoId` -- bastara adicionar uma query simples ou receber como prop.

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/shuttle/ShuttleMetrics.tsx` | Adicionar KPI de veiculos em operacao |
| `src/components/app/ClienteDashboardTab.tsx` | Condicionar metricas por tipo de operacao (shuttle vs missao) |
| `src/pages/app/AppCliente.tsx` | Propagar `tipos_viagem_habilitados` para o dashboard |
| `src/components/eventos/EventoTabs.tsx` | Passar `totalVeiculos` para ShuttleMetrics |

## Nota: O que ja funciona e NAO sera alterado

- **Localizador**: A visibilidade da aba ja e controlada por `habilitar_localizador`. Quando desabilitado, o botao/aba ja nao aparece.
- **Auditoria**: O filtro por tipo de operacao ja funciona para shuttle, com todos os graficos e rankings respondendo ao filtro.
- **Criacao de shuttle**: O `CreateShuttleForm` ja permite selecionar veiculo, pontos de embarque/desembarque e PAX. O registro na tabela `viagens` ja inclui `veiculo_id`.
