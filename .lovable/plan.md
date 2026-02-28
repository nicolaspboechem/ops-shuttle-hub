

# Ajustar Localizador e Dados do App Cliente

## Diagnostico

### Problema 1: Localizador do Cliente usa layout antigo
O `ClienteLocalizadorTab` usa o layout horizontal com colunas kanban (`LocalizadorColumn` + `MapaServicoScrollContainer`), enquanto o `SupervisorLocalizadorTab` usa um layout vertical moderno com grupos colapsaveis, busca por texto e filtros por estatisticas (Em Transito / Base / Outros). O pedido e que o cliente tenha a mesma interface do supervisor.

### Problema 2: Localizador nao mostra dados neste evento shuttle
O hook `useLocalizadorMotoristas` filtra motoristas com **check-in ativo** (`motorista_presenca`). Neste evento Routes Hotel 2026, **nao existem registros na tabela `motoristas`** -- as viagens shuttle usam `motorista: 'Shuttle'` como texto generico, sem vinculo a registros de motoristas. Portanto o localizador ficara vazio ate que motoristas sejam cadastrados e faca check-in. **Isso nao e um bug de codigo**, e uma questao de setup operacional -- o localizador depende de motoristas cadastrados.

### Problema 3: Dashboard do Cliente ja funciona corretamente
O `ClienteDashboardTab` usa `useViagens` que busca todas as viagens do evento. Os KPIs (PAX, viagens ativas, encerradas, tempo medio, etc) ja estao sendo calculados corretamente a partir dos dados reais da tabela `viagens`. Os dados exibidos refletem fielmente o que existe no banco.

### Problema 4: Painel de Horarios funciona corretamente
O `ClientePainelTab` busca rotas shuttle via `useRotasPublicas`. Se nao ha rotas shuttle configuradas na tabela `rotas_shuttle`, aparecera vazio -- novamente, questao de setup.

## Mudancas propostas

### 1. Reescrever `ClienteLocalizadorTab` com o mesmo layout do Supervisor (somente leitura)

Substituir o conteudo do `src/components/app/ClienteLocalizadorTab.tsx` para usar o mesmo padrao do `SupervisorLocalizadorTab`:
- Cards verticais com grupos colapsaveis (Em Transito, Base, outros locais, Sem Localizacao)
- Filtros por estatisticas (3 cards clicaveis: Em Transito / Base / Outros)
- Campo de busca por nome do motorista ou placa
- **Sem** o modal de editar localizacao (cliente e somente leitura)
- Usar o mesmo hook `useLocalizadorMotoristas` que ja fornece os dados agrupados

A diferenca em relacao ao supervisor e que:
- Nao tera o `EditarLocalizacaoModal` (cliente nao edita)
- Os cards de motorista nao serao clicaveis para edicao
- Remover a busca de missoes avulsas que existe no componente atual (desnecessaria, o hook ja traz a info de viagem)

### Arquivo afetado
- `src/components/app/ClienteLocalizadorTab.tsx` -- reescrito para usar layout vertical colapsavel identico ao supervisor, porem somente leitura

## Nota sobre dados vazios

O localizador so exibira motoristas quando:
1. Motoristas estejam cadastrados para o evento
2. Motoristas tenham feito check-in no dia operacional

Se o evento opera com shuttles genericos (sem vincular motoristas reais), o localizador ficara vazio. Isso e esperado e nao e um bug.

