

# Plano Consolidado: Sidebar CCO + Ordenacao de Veiculos + Status Pendente

## 1. Correcao da Sidebar CCO (flickering ao passar o mouse)

**Arquivo:** `src/components/layout/MainLayout.tsx`

**Causa:** Todos os itens de navegacao estao envolvidos em `Tooltip` + `TooltipTrigger asChild` (linhas 67-81), mesmo quando a sidebar esta expandida. Com `delayDuration={0}` (linha 42), o Radix intercepta eventos de ponteiro imediatamente, causando re-renders e atrasando cliques.

**Correcao:**
- Envolver em `Tooltip` apenas quando `collapsed === true`
- Quando expandido, renderizar o `NavLink` diretamente sem wrapper de Tooltip
- Aumentar `delayDuration` de `0` para `300` para evitar flicker entre itens

```text
Antes:
  <Tooltip key={item.name}>
    <TooltipTrigger asChild>
      <NavLink .../>
    </TooltipTrigger>
    {collapsed && <TooltipContent .../>}
  </Tooltip>

Depois:
  Se collapsed:
    <Tooltip key={item.name}>
      <TooltipTrigger asChild><NavLink .../></TooltipTrigger>
      <TooltipContent side="right">{item.name}</TooltipContent>
    </Tooltip>
  Se expandido:
    <NavLink key={item.name} .../> (sem wrapper)
```

---

## 2. Ordenacao de veiculos por nome na vinculacao

**Arquivo:** `src/pages/VincularVeiculo.tsx`

**Correcao:** Adicionar `.sort()` no `useMemo` de `veiculosComMotorista` (linha 97) para ordenar por nome/placa usando `localeCompare` com `numeric: true` (garante que "Veiculo 2" vem antes de "Veiculo 10").

```text
.sort((a, b) => {
  const nomeA = (a.nome || a.placa).toLowerCase();
  const nomeB = (b.nome || b.placa).toLowerCase();
  return nomeA.localeCompare(nomeB, 'pt-BR', { numeric: true });
})
```

---

## 3. Correcao do status "Pendente" no Wizard e Filtro

**Diagnostico:** O codigo-fonte ja possui o status `pendente` definido em todos os componentes relevantes (VistoriaVeiculoWizard, VeiculoCardSupervisor, SupervisorFrotaTab, VincularVeiculo). A funcao de submit do wizard (linha 215) grava `status: statusFinal` corretamente. A query ao banco mostra que todos os 41 veiculos estao como `liberado` -- nenhum esta `pendente`.

**Possiveis causas de falha identificadas:**

1. **VistoriaVeiculoWizard.tsx**: Ao editar (re-vistoria), se o wizard nao encontra o motorista via `motorista_presenca` (o que e normal se nao houver presenca registrada), a query `maybeSingle()` retorna null sem erro -- isso nao deveria bloquear. Porem, se houver **erro na query de presenca** que nao esta sendo tratado, o `try/catch` engolira o erro e mostrara "Erro ao criar veiculo" generico.

2. **Erro silencioso**: O `catch` (linhas 281-283) mostra `toast.error('Erro ao salvar vistoria')` sem detalhar qual erro ocorreu, dificultando o diagnostico.

**Correcoes:**
- **Adicionar log de erro** no catch do wizard para exibir a mensagem real do erro no toast (ex: `toast.error('Erro: ' + error.message)`)
- **Adicionar tratamento explicito** para o campo `status` no update do wizard, garantindo que o valor `pendente` esta sendo enviado sem transformacao
- **Testar a gravacao** diretamente: se o status `pendente` salva corretamente via `handleStatusChange` do supervisor (swipe esquerda no card), o problema esta isolado no wizard

**Arquivo:** `src/components/app/VistoriaVeiculoWizard.tsx`
- Melhorar mensagem de erro no catch (linhas 280-283)
- Adicionar `console.error` para debugging

**Arquivo:** `src/components/app/SupervisorFrotaTab.tsx`
- Nenhuma alteracao necessaria (status pendente ja esta mapeado corretamente nos filtros e agrupamentos)

---

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/MainLayout.tsx` | Condicionar Tooltip ao estado collapsed, delayDuration 300 |
| `src/pages/VincularVeiculo.tsx` | Ordenar veiculos por nome com localeCompare numeric |
| `src/components/app/VistoriaVeiculoWizard.tsx` | Melhorar tratamento de erro no catch para diagnosticar falha do status pendente |

