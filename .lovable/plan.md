

# Nova Aba "Mapa de Servico" no CCO

## Resumo

Criar uma nova aba dentro do CCO (sidebar do evento) chamada **"Mapa de Servico"** que funciona como um painel Kanban interativo com drag-and-drop, combinando a visualizacao do Localizador com o controle operacional de missoes.

## Funcionalidades

### 1. Kanban com Drag-and-Drop por Localizacao
- Colunas representam locais (pontos de embarque) + colunas especiais ("Em Transito", "Retornando para Base", "Sem Local")
- Cards de motorista/veiculo podem ser arrastados entre colunas
- Ao soltar um card em outra coluna, o sistema atualiza `ultima_localizacao` do motorista automaticamente (mesmo comportamento do EditarLocalizacaoModal, mas via drag)
- Usa a biblioteca `@dnd-kit` ja instalada no projeto

### 2. Botao "Chamar para Base"
- Disponivel em cada card de motorista ou como acao em lote
- Ao clicar, o sistema:
  1. Cria uma missao automatica com titulo "Retorno a Base"
  2. Define `ponto_embarque` = localizacao atual do motorista
  3. Define `ponto_desembarque` = nome do ponto marcado como Base (eh_base=true)
  4. O motorista recebe a missao no app (ja tem realtime)
  5. O card do motorista vai para a coluna "Retornando para Base"

### 3. Visualizacao de Missoes nos Cards
- Cada card mostra se o motorista tem missao ativa (badge colorido)
- Missao pendente: badge amarelo "Missao Pendente"
- Missao aceita: badge azul "Missao Aceita"
- Em andamento: badge verde com rota (origem -> destino)

### 4. Badge "Backup" nos Veiculos
- Opcao de marcar veiculos como "Backup" diretamente no card
- Toggle visual que adiciona/remove um badge no card
- Persiste via campo `observacoes_gerais` ou um novo campo dedicado na tabela veiculos (abordagem simples: usar tag no campo existente)

### 5. Descricao Editavel nos Cards
- Campo de texto curto clicavel no card
- Permite anotar observacoes rapidas (ex: "aguardando passageiro VIP", "problema no ar condicionado")
- Salva na tabela `motoristas.observacao`

## Onde fica na interface

Nova entrada na sidebar do CCO, na secao "Monitoramento":

```text
Monitoramento
  - Dashboard
  - Mapa de Servico  <-- NOVO (icone: Map)
  - Viagens Ativas
  - Finalizadas
```

Rota: `/evento/:eventoId/mapa-servico`

## Arquivos a criar

1. **`src/pages/MapaServico.tsx`** - Pagina principal com layout Kanban
2. **`src/components/mapa-servico/MapaServicoColumn.tsx`** - Coluna droppable do Kanban
3. **`src/components/mapa-servico/MapaServicoCard.tsx`** - Card draggable do motorista com missao, badge backup e descricao editavel
4. **`src/components/mapa-servico/ChamarBaseModal.tsx`** - Confirmacao ao chamar motorista para base

## Arquivos a editar

1. **`src/components/layout/AppSidebar.tsx`** - Adicionar item "Mapa de Servico" na secao Monitoramento
2. **`src/App.tsx`** - Adicionar rota `/evento/:eventoId/mapa-servico`
3. **`src/hooks/useLocalizadorMotoristas.ts`** - Reutilizado como fonte de dados principal
4. **`src/hooks/useMissoes.ts`** - Reutilizado para criar missoes (chamar para base)
5. **`src/lib/version.ts`** - Atualizar para 1.3.0

## Detalhes tecnicos

### Drag-and-Drop com @dnd-kit

```text
DndContext (pagina)
  |-- SortableContext por coluna
  |    |-- MapaServicoColumn (useDroppable)
  |    |    |-- MapaServicoCard (useDraggable)
  |
  |-- DragOverlay (card fantasma durante arraste)
```

Ao evento `onDragEnd`:
- Identificar coluna de destino
- Chamar `supabase.from('motoristas').update({ ultima_localizacao: novaColuna })` 
- Se destino = "em_transito", ignorar (nao pode arrastar manualmente para transito)
- Se destino = coluna valida (ponto de embarque), atualizar localizacao

### Logica "Chamar para Base"

```text
1. Buscar ponto com eh_base=true do evento
2. Criar missao:
   - titulo: "Retorno a Base"
   - ponto_embarque: motorista.ultima_localizacao
   - ponto_desembarque: base.nome
   - motorista_id: motorista.id
   - prioridade: "normal"
   - status: "pendente"
3. Atualizar motorista.status = "em_viagem" (opcional, pode aguardar aceite)
4. Toast de confirmacao
```

### Badge Backup

Abordagem simples: usar um campo JSON ou tag no `veiculos.observacoes_gerais` com prefixo `[BACKUP]`. O card verifica se contem esse prefixo e exibe badge laranja. Toggle adiciona/remove o prefixo.

### Estrutura do Card

```text
+----------------------------------+
| [Status] Disponivel    ha 15min  |
| JOAO SILVA                       |
| Van ABC-1234 [BACKUP]            |
| Missao: Rota Hotel -> Evento     |
| obs: aguardando VIP              |
| [Chamar Base] [Editar]           |
+----------------------------------+
```

## Fluxo de uso esperado

```text
1. Admin abre "Mapa de Servico"
2. Ve todos os motoristas com check-in ativo organizados por local
3. Arrasta motorista de "Jockey" para "Hotel Copacabana" (atualiza localizacao)
4. Clica "Chamar para Base" no card de um motorista em "Aeroporto"
5. Sistema cria missao automatica de retorno
6. Motorista recebe no app, aceita, e o card vai para "Retornando para Base"
7. Admin marca um veiculo como "Backup" com toggle no card
8. Admin adiciona observacao "Disponivel para VIP" no campo de descricao
```

