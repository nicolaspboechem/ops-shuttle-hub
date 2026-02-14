

# Filtro por Data no Historico + Limpeza Shuttle no Operador

## Resumo

Duas alteracoes principais:

1. **App Motorista - Historico com filtro por data**: O historico atual carrega todas as viagens finalizadas de todos os dias, o que fica confuso. Sera adicionado o componente `DiaSeletor` para filtrar por data operacional.

2. **App Operador - Remover lista de shuttles do historico**: A aba "Historico" do operador lista todas as corridas shuttle individualmente, o que polui a interface. Sera transformada em um dashboard visual apenas com metricas (total shuttles, PAX, etc.) sem listar cada corrida. O historico detalhado de shuttle ja existe no CCO via `ShuttleTable` na `EventoTabs`.

---

## Detalhes Tecnicos

### 1. MotoristaHistoricoTab - Filtro por Data

**Arquivo:** `src/components/app/MotoristaHistoricoTab.tsx`

- Adicionar props `dataOperacional` e `onDataChange` ao componente
- Adicionar props `dataInicio` e `dataFim` do evento para limitar o seletor
- Importar e renderizar o componente `DiaSeletor` no topo da aba
- Filtrar `viagensFinalizadas` pela `dataOperacional` selecionada (comparando `data_criacao` com a data operacional)

**Arquivo:** `src/pages/app/AppMotorista.tsx`

- Passar `dataOperacional`, `setDataOperacional`, `evento?.data_inicio`, `evento?.data_fim` como props para `MotoristaHistoricoTab`
- O filtro de `minhasViagensFinalizadas` permanece como esta (filtra por status), mas agora tambem filtrara por data operacional
- Mover o filtro de data para dentro do `MotoristaHistoricoTab` ou filtrar antes de passar as viagens

**Abordagem escolhida:** Filtrar no proprio `MotoristaHistoricoTab` usando a data operacional. O componente recebera todas as viagens finalizadas e filtrara internamente pela data selecionada, usando `getDataOperacional` para comparar corretamente com o horario de virada do dia.

Novas props:
```text
+ horarioVirada?: string
+ dataInicio?: string
+ dataFim?: string
```

O componente tera um estado interno `dataSelecionada` com default = data operacional atual, e usara `DiaSeletor` para navegar entre datas.

### 2. OperadorHistoricoTab - Dashboard Visual (sem lista)

**Arquivo:** `src/components/app/OperadorHistoricoTab.tsx`

- Remover toda a lista de cards de viagens individuais
- Manter apenas o bloco de resumo (grid com Encerradas, Canceladas, PAX Total)
- Adicionar mais metricas visuais se aplicavel (ex: hora do primeiro e ultimo shuttle)
- Resultado: dashboard limpo com apenas numeros agregados

**Arquivo:** `src/pages/app/AppOperador.tsx`

- A aba "Viagens" ja mostra a lista de shuttles com ShuttleRegistroCard - isso permanece
- A aba "Historico" passa a mostrar apenas o dashboard visual de metricas

### Sem alteracoes no CCO

O CCO ja possui visualizacao de historico de shuttle via `ShuttleTable` dentro de `EventoTabs.tsx` (aba "Shuttle"). Nenhuma alteracao necessaria no CCO.

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/app/MotoristaHistoricoTab.tsx` | Adicionar DiaSeletor com estado interno de data, filtrar viagens pela data selecionada |
| `src/pages/app/AppMotorista.tsx` | Passar props de evento (horarioVirada, dataInicio, dataFim) para MotoristaHistoricoTab |
| `src/components/app/OperadorHistoricoTab.tsx` | Remover lista de cards individuais, manter apenas dashboard de metricas |

