
# Remover Toggle "Auto" e Manter Auto-Refresh Sempre Ativo

## Problema

O switch "Auto" no header do Mapa de Servico controla a atualizacao automatica a cada 30 segundos, mas ele inicia **desligado** (`useState(false)`). Para um painel operacional, isso deveria estar sempre ativo.

## Mudancas

### 1. `src/pages/MapaServico.tsx`

- Mudar o estado inicial de `autoRefresh` para `true`
- Remover o state `autoRefresh` e o setter -- a variavel passa a ser uma constante `true`
- Remover as props `autoRefresh` e `onAutoRefreshChange` do `MapaServicoHeader`

### 2. `src/components/mapa-servico/MapaServicoHeader.tsx`

- Remover o Switch "Auto" e suas props (`autoRefresh`, `onAutoRefreshChange`) da interface e do render
- Manter o botao "Atualizar" manual e a barra de progresso (que agora esta sempre visivel)

## Resultado

O painel sempre atualiza automaticamente a cada 30 segundos, sem opcao de desligar. O botao "Atualizar" continua disponivel para refresh manual imediato.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/MapaServico.tsx` | autoRefresh sempre true, remover state e props |
| `src/components/mapa-servico/MapaServicoHeader.tsx` | Remover Switch "Auto" e props relacionadas |
