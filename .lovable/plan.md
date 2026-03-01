
# Adicionar card "Frota por Tipo" com hover detalhado

## O que sera feito

Na secao "Consolidado do Dia" do `ClienteDashboardTab`, adicionar um card que mostra a distribuicao real da frota cadastrada (tabela `veiculos`) agrupada por `tipo_veiculo`. Cada tipo tera um hover/popover que exibe os detalhes dos veiculos daquele tipo (placa, nome, status, capacidade).

## Mudancas

### 1. Expandir a query de veiculos para incluir campos extras

**Arquivo:** `src/components/app/ClienteDashboardTab.tsx`

A interface `VeiculoFrota` e a query de veiculos serao expandidas para incluir os campos `nome`, `status` e `capacidade`, necessarios para o balao de detalhes:

```typescript
interface VeiculoFrota {
  id: string;
  tipo_veiculo: string;
  nivel_combustivel: string | null;
  placa: string;
  nome: string | null;
  status: string | null;
  capacidade: number | null;
}
```

A query passara a ser:
```typescript
.select('id, tipo_veiculo, nivel_combustivel, placa, nome, status, capacidade')
```

### 2. Adicionar computed `frotaPorTipo`

Novo `useMemo` que agrupa os veiculos cadastrados por `tipo_veiculo`, retornando para cada tipo a lista de veiculos e a contagem:

```typescript
const frotaPorTipo = useMemo(() => {
  const grouped: Record<string, VeiculoFrota[]> = {};
  veiculos.forEach(v => {
    const tipo = v.tipo_veiculo || 'Outro';
    if (!grouped[tipo]) grouped[tipo] = [];
    grouped[tipo].push(v);
  });
  return Object.entries(grouped).sort(([,a], [,b]) => b.length - a.length);
}, [veiculos]);
```

### 3. Adicionar card "Frota por Tipo" com Popover

Na secao "Consolidado do Dia", logo apos os 4 MetricCards e antes do bloco de insights, adicionar um novo `Card` com:

- Titulo: "Frota por Tipo" com icone de Car
- Para cada tipo de veiculo, uma linha com: icone, nome do tipo, contagem, e percentual
- Cada linha sera envolvida por um `Popover` (ja disponivel no projeto via `@radix-ui/react-popover`)
- Ao clicar/hover na linha, o popover exibe uma lista com os detalhes de cada veiculo daquele tipo:
  - Placa
  - Nome (se disponivel)
  - Status (em_inspecao, disponivel, em_viagem, etc.)
  - Capacidade (lugares)

O Popover sera usado ao inves de Tooltip porque permite conteudo mais rico e funciona melhor em mobile (ativado por toque).

### 4. Imports adicionais

Adicionar import do `Popover, PopoverTrigger, PopoverContent` de `@/components/ui/popover`.

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/app/ClienteDashboardTab.tsx` | Expandir query de veiculos, adicionar `frotaPorTipo`, renderizar card com popover detalhado |

Nenhum arquivo novo sera criado. O componente `Popover` ja existe no projeto.

## Detalhes visuais

O card tera o mesmo estilo dos cards existentes (como "Combustivel da Frota"). Cada linha de tipo sera clicavel e ao tocar/hover aparece o popover com uma tabela compacta mostrando:

```text
+----------------------------------+
| Frota por Tipo (8 veiculos)      |
|----------------------------------|
| [Bus] Van         5   (63%)  [>] |
| [Bus] Onibus      2   (25%)  [>] |
| [Car] SUV         1   (13%)  [>] |
+----------------------------------+

Popover ao clicar em "Van":
+---------------------------+
| Van (5 veiculos)          |
|---------------------------|
| ABC-1234 | Van 01 | 15lug |
| DEF-5678 | Van 02 | 15lug |
| GHI-9012 | Van 03 | 12lug |
| JKL-3456 | --     | 15lug |
| MNO-7890 | Van 05 | 15lug |
+---------------------------+
```
