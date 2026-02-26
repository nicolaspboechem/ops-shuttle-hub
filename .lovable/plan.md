

# Fechamento do Evento - Consolidacao da Auditoria

## Visao Geral

O plano consiste em duas acoes principais:
1. **Encerrar as 11 viagens ainda "em_andamento"** no banco de dados (fechamento operacional)
2. **Reestruturar a pagina Auditoria** (`src/pages/Auditoria.tsx`) para incluir abas com consolidacao de Viagens, Veiculos, Motoristas e Abastecimento

---

## Parte 1: Encerrar Viagens Pendentes (SQL)

Existem **11 viagens** com status `em_andamento` que precisam ser encerradas para fechar o evento. Serao atualizadas para `status = 'encerrado'` e `encerrado = true`, com observacao de fechamento administrativo.

---

## Parte 2: Reestruturar a Pagina de Auditoria

A pagina atual (`src/pages/Auditoria.tsx`) ja tem cards de totais, graficos e tabelas de pontos. O plano e:

### 2.1 Adicionar sistema de abas (Tabs)

Criar 4 abas dentro da pagina de Auditoria:
- **Resumo Geral** (aba atual, com os cards de totais, graficos e tabela por pontos)
- **Motoristas** (tabela consolidada com viagens e PAX por motorista)
- **Veiculos** (tabela consolidada com viagens e PAX por veiculo, sem KM)
- **Abastecimento** (resumo de alertas de combustivel)

### 2.2 Aba "Resumo Geral" (reestruturar a existente)

Manter:
- Cards de totais: Total Viagens, Total PAX, Veiculos utilizados, Motoristas ativos
- Substituir card de "KM Total" por card de **"Alertas Combustivel"** (138 total, 134 resolvidos)
- Graficos: Viagens/PAX por Hora e Viagens por Tipo de Veiculo (mantidos)
- Tabela de Totais por Ponto de Embarque (mantida)

### 2.3 Aba "Motoristas"

Tabela ordenada por total de viagens:
- Colunas: Motorista | Total Viagens | Total PAX | Media PAX/Viagem
- Dados calculados a partir das viagens filtradas pelo tipo de operacao
- Botao de exportar Excel

### 2.4 Aba "Veiculos"

Tabela ordenada por total de viagens:
- Colunas: Placa | Tipo | Total Viagens | Total PAX | Motorista vinculado
- Sem KM (conforme solicitado)
- Botao de exportar Excel

### 2.5 Aba "Abastecimento"

Cards de resumo:
- Total de alertas emitidos
- Alertas resolvidos
- Alertas ainda abertos
- Taxa de resolucao (%)

Utiliza o hook `useAlertasFrota` ja existente, adicionando query para buscar alertas resolvidos (atualmente o hook so busca abertos/pendentes). Sera feita uma query direta para contagem consolidada.

---

## Arquivos a modificar

1. **`src/pages/Auditoria.tsx`** - Reestruturar com Tabs (Resumo, Motoristas, Veiculos, Abastecimento), remover tabela de KM, adicionar tabelas de motoristas e veiculos, adicionar secao de abastecimento
2. **SQL (insert tool)** - Encerrar 11 viagens pendentes

## Detalhes tecnicos

- Tabs usando `@radix-ui/react-tabs` (ja instalado e disponivel em `src/components/ui/tabs.tsx`)
- Dados de abastecimento via query direta no Supabase (contagem total incluindo resolvidos)
- Tabela de motoristas e veiculos calculadas no frontend a partir dos dados ja carregados (`useViagens`, `useCadastros`)
- OperationTabs mantido para filtrar por tipo de operacao em todas as abas
- Exportacao Excel com `xlsx` (ja instalado)

