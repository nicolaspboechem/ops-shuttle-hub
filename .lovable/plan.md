

# Auditoria de Abastecimento - Analise Completa por Veiculo

## Contexto dos Dados

Temos 138 alertas de combustivel no evento, com niveis registrados: `1/4` (28), `1/2` (60), `3/4` (23), `cheio` (26), `vazio` (1). Cada alerta tem veiculo, motorista, nivel e timestamp. Isso permite montar KPIs reais de consumo e comportamento de abastecimento.

## Alteracoes

### 1. Novo hook: `src/hooks/useAlertasFrotaDetalhado.ts`

Busca todos os alertas do evento com JOINs (veiculo nome/placa/tipo, motorista nome), retornando dados completos para analise no frontend.

Query: `alertas_frota` com select de `*, veiculo:veiculos!veiculo_id(nome, placa, tipo_veiculo), motorista:motoristas!motorista_id(nome)` filtrado por `evento_id`.

### 2. Reestruturar `AuditoriaAbastecimentoTab.tsx`

Manter os 4 cards de resumo no topo e adicionar abaixo:

**Tabela "Abastecimento por Veiculo"** (principal):
- Coluna `#` (posicao, ordenado por total alertas DESC)
- Coluna `Veiculo` (nome destaque + placa secundaria)
- Coluna `Total Alertas`
- Coluna `Nivel Medio` (media ponderada: reserva=0, 1/4=25, 1/2=50, 3/4=75, cheio=100 - mostrado como %)
- Coluna `Alertas Criticos` (contagem de niveis 1/4 + reserva/vazio)
- Coluna `Motoristas` (quantidade de motoristas distintos que reportaram)
- Coluna `Status` (badge: todos resolvidos = verde, pendentes = vermelho)
- Medalhas top 3 (veiculos com MAIS alertas = mais consumo)
- Botao exportar Excel

**Cards de KPIs adicionais** (antes da tabela):
- `Veiculos Monitorados` - total de veiculos distintos com alertas
- `Media Alertas/Veiculo` - total alertas / veiculos distintos
- `Alertas Criticos (1/4 ou menos)` - soma de alertas com nivel 1/4 + vazio/reserva
- `Distribuicao` - mini resumo: X em 1/4, Y em 1/2, Z em 3/4, W cheio

### 3. Atualizar `Auditoria.tsx`

Passar `eventoId` como prop para `AuditoriaAbastecimentoTab` (alem dos totais ja existentes), para que o componente possa buscar os dados detalhados via hook.

## Arquivos modificados

1. `src/hooks/useAlertasFrotaDetalhado.ts` - **novo** - hook para buscar alertas completos
2. `src/components/auditoria/AuditoriaAbastecimentoTab.tsx` - reestruturar com tabela por veiculo e KPIs
3. `src/pages/Auditoria.tsx` - passar eventoId para AuditoriaAbastecimentoTab

## Detalhes tecnicos

- Calculos de nivel medio feitos no frontend com mapa de conversao: `{ 'vazio': 0, 'reserva': 0, '1/4': 25, '1/2': 50, '3/4': 75, 'cheio': 100 }`
- Agrupamento por `veiculo_id` usando Map no useMemo
- Exportacao Excel com xlsx (ja instalado)
- Ordenacao por total de alertas DESC (veiculos que mais consumiram)
