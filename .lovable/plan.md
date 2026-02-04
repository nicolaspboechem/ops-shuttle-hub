# Plano: Exibição de Vistorias e Avarias - CONCLUÍDO ✅

## Implementado

1. ✅ **Hook useCadastros** - Adicionado join com `profiles` para resolver `inspecao_por` e `liberado_por`
2. ✅ **VeiculoKanbanCardFull** - Exibe data/hora da inspeção, quem fez e contagem de avarias
3. ✅ **VeiculosListView** - Coluna "Última Inspeção" com nome do inspetor e avarias
4. ✅ **VeiculoDetalheModal** - Mostra quem fez a inspeção e liberação nas seções correspondentes
5. ✅ **Migração SQL** - Populou `veiculo_vistoria_historico` retroativamente

## Resultado

- Cards de veículos mostram data/hora da última inspeção e quem fez
- Lista de veículos tem coluna dedicada à última inspeção
- Modal de detalhes mostra informações completas: avarias, fotos, inspetor, data
- Histórico de vistorias foi preenchido retroativamente
