

# Filtro por Data e Historico na Escala (Mapa de Servico)

## Resumo

Adicionar um seletor de data na aba Escala do Mapa de Servico, permitindo visualizar o estado de presenca dos motoristas em qualquer dia passado (historico), nao apenas o dia atual.

## Como funciona hoje

- A aba Escala mostra as escalas cadastradas com os motoristas vinculados
- Os dados de presenca (check-in/checkout) vem do hook `useEquipe`, que retorna apenas o dia atual
- Nao ha como ver o historico de dias anteriores

## O que sera feito

- Adicionar um **date picker** no header da aba Escala (ao lado de "Escalas de Turno" e do botao "Nova Escala")
- Por padrao, a data selecionada sera o dia operacional atual (calculado via `getDataOperacional` com o `horarioVirada` do evento)
- Ao selecionar outra data, buscar os registros de `motorista_presenca` daquele dia especifico e atualizar os badges de status (Ativo/Saiu) e os indicadores coloridos
- Quando uma data passada estiver selecionada, exibir um badge indicando "Historico" para deixar claro que nao e tempo real

## Alteracoes Tecnicas

### 1. `src/components/motoristas/MotoristasEscala.tsx`

**Adicionar props e state:**
- Nova prop opcional `horarioVirada?: string` (para calcular dia operacional)
- Novo state `selectedDate` inicializado com `getDataOperacional(new Date(), horarioVirada)`
- Novo state `presencasPorData` com fetch direto de `motorista_presenca` filtrado pela data selecionada

**Adicionar fetch de presenca por data:**
- Quando `selectedDate` muda, buscar `motorista_presenca` do `evento_id` + `data = selectedDate`
- Criar funcao local `getPresencaByDate(motoristaId)` que retorna os dados da data selecionada
- Se a data selecionada for o dia operacional atual, usar a prop `getPresenca` original (tempo real via `useEquipe`)
- Se for dia passado, usar os dados buscados do banco

**Adicionar DatePicker no header:**
- Usar `Popover` + `Calendar` (padrao shadcn) entre o titulo e o botao "Nova Escala"
- Botoes de navegacao rapida (seta esquerda/direita) para dia anterior/proximo
- Badge "Historico" quando a data nao for hoje

**Ajustar KPIs no header da coluna:**
- O contador "X ativos" na coluna usara os dados da data selecionada

### 2. `src/pages/MapaServico.tsx`

- Passar a prop `horarioVirada` para o componente `MotoristasEscala`

Nenhuma alteracao de banco de dados necessaria -- a tabela `motorista_presenca` ja possui o campo `data` e os dados historicos.

