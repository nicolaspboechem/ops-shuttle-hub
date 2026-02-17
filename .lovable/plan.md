
# Adicionar Pesquisa no Dropdown de Motorista (Filtro de Missoes)

## Problema

No Mapa de Servico, aba Missoes, o filtro de motorista usa um dropdown simples (`Select`) sem campo de busca. Com muitos motoristas, fica dificil encontrar o desejado.

## Solucao

Substituir o `Select` do filtro de motorista por um combobox pesquisavel usando `Popover` + `Command` (mesmo padrao ja usado nos modais de criacao de missao).

## Alteracao

### Arquivo: `src/components/motoristas/MissoesPanel.tsx`

**Linhas 348-359** -- Substituir o bloco `<Select>` do filtro de motorista por:

```text
De:
  <Select value={missaoMotoristaFilter} onValueChange={setMissaoMotoristaFilter}>
    <SelectTrigger className="w-[180px]">
      <User className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Motorista" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos motoristas</SelectItem>
      {motoristasCadastrados.filter(m => m.ativo).map(m => (
        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
      ))}
    </SelectContent>
  </Select>

Para:
  Popover + Command com CommandInput para busca,
  opcao "Todos motoristas" como primeiro item,
  e lista pesquisavel dos motoristas ativos.
```

Sera necessario adicionar um state `motoristaFilterOpen` para controlar a abertura do Popover. Os imports de `Popover`, `Command`, `ChevronsUpDown`, `Check` ja existem no arquivo.

Nenhum outro arquivo precisa ser alterado.
