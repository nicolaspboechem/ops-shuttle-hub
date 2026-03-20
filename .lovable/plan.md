

## Plano: Filtro por coordenador + correção de exibição na tabela CCO

### Problema 1: Falta filtro por coordenador (quem iniciou/finalizou)
A FilterBar não tem filtro por coordenador/operador. O usuário precisa identificar qual operador iniciou e qual finalizou cada shuttle.

### Problema 2: Dados errados nas colunas da tabela
- Coluna "Motorista" mostra `viagem.motorista` (ex: "Shuttle") — deveria mostrar o **nome da viagem** (`coordenador`) ou título da missão
- Coluna "Veículo" mostra apenas `tipo_veiculo` (ex: "Van") — deveria mostrar o **apelido do veículo** (`veiculo.nome`) e a placa

### Mudanças

**1. `src/components/viagens/FilterBar.tsx`**
- Adicionar campo `coordenador` ao tipo `Filtros`
- Aceitar nova prop `coordenadores: string[]` com lista de nomes resolvidos
- Renderizar Select de "Coordenador" (operador que iniciou/finalizou)
- Atualizar `clearFilters` e `hasActiveFilters`

**2. `src/pages/ViagensAtivas.tsx` e `src/pages/ViagensFinalizadas.tsx`**
- Extrair lista de `iniciado_por` e `finalizado_por` IDs únicos das viagens
- Usar `useUserNames` para resolver nomes
- Montar lista de coordenadores e passar para FilterBar
- Adicionar filtro por coordenador na lógica de `viagensFiltradas`
- Adicionar `coordenador: 'todos'` ao estado inicial de filtros

**3. `src/components/viagens/ViagensTable.tsx`**
- Coluna "Motorista" → renomear para **"Viagem"**: mostrar `coordenador` (nome da viagem) como texto principal; rota embaixo como subtítulo
- Coluna "Veículo" → mostrar `veiculo.nome` (apelido) como principal e `placa` como subtítulo mono; manter ícone
- Remover coluna "Placa" separada (já estará dentro de Veículo)
- Adicionar coluna **"Finalizado por"** ao lado de "Iniciado por", resolvendo `finalizado_por` via `useUserNames`
- Coletar `finalizado_por` IDs no `responsavelIds` para resolução de nomes

### Resultado
- Operador consegue filtrar por quem iniciou/finalizou
- Cada linha mostra claramente: nome da viagem, apelido+placa do veículo, quem iniciou e quem finalizou

