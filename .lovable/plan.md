
# Corrigir Alertas Criticos Falsos e Adicionar Botao "Lido"

## Problema Identificado

Na funcao `calcularKPIsDashboard` (arquivo `calculadores.ts`, linha 214-229), os alertas sao calculados para todas as viagens onde `encerrado === false`. Porem, viagens que ja chegaram ao destino (tem `h_chegada` preenchido) mas ainda nao foram encerradas (status `aguardando_retorno`, por exemplo) continuam sendo avaliadas. A funcao `calcularStatusViagem` calcula o tempo decorrido desde o pickup ate agora, gerando alertas criticos falsos para viagens que ja finalizaram a perna de ida.

## Correcao do Bug

**Arquivo:** `src/lib/utils/calculadores.ts`

Na linha 224, onde filtra viagens para calcular alertas:

**Antes:**
```
viagensAtivas.filter(v => v.h_pickup).forEach(viagem => {
```

**Depois:**
```
viagensAtivas.filter(v => v.h_pickup && !v.h_chegada).forEach(viagem => {
```

Viagens que ja possuem `h_chegada` ja completaram a perna de ida. Nao faz sentido monitorar o tempo de deslocamento delas -- o tempo ja esta definido. Apenas viagens em transito (sem `h_chegada`) devem gerar alertas de tempo.

## Botao "Lido" no Painel de Alertas

**Arquivo:** `src/components/dashboard/AlertsPanel.tsx`

Adicionar um estado local `dismissedIds` (Set de IDs de viagens) que persiste durante a sessao. Para cada alerta exibido, mostrar um botao "Lido" que adiciona o `viagemId` ao set, removendo-o visualmente da lista.

- O estado sera gerenciado internamente no componente `AlertsPanel`
- Filtrar `criticos` e `alertas` removendo os IDs no `dismissedIds`
- Botao pequeno com icone CheckCircle + texto "Lido" no canto de cada `AlertItem`
- Ao clicar, o alerta desaparece da lista e os contadores se atualizam
- O estado reseta automaticamente quando os dados mudam (novo refresh)

Nao sera necessario persistir no banco pois os alertas sao recalculados a cada atualizacao de dados. Se a viagem for realmente encerrada no proximo ciclo, o alerta desaparece naturalmente.

---

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/utils/calculadores.ts` | Filtrar viagens com `h_chegada` do calculo de alertas |
| `src/components/dashboard/AlertsPanel.tsx` | Adicionar botao "Lido" para dispensar alertas |
