
# Card de Combustivel - Expandivel com Fundo Amarelo

## O que sera feito

Ajustar o card de combustivel no grid de metricas do Dashboard para que:

1. **Sem alertas**: card normal, compacto, mostrando "0 alertas abertos"
2. **Com alertas**: card fica com fundo **amarelo** (warning) e se expande para ocupar mais espaco no grid, exibindo a lista completa de alertas

## Layout do card expandido (com alertas)

```text
[Fuel icon]  Combustivel         X alertas
─────────────────────────────────────────
 Motorista       | Veiculo  | [...]
 Edenilson       | ABC-1234 | [Chamar Base / Manutencao / Resolver]
 Joao            | DEF-5678 | [Chamar Base / Manutencao / Resolver]
```

Cada linha mostra: **Motorista - Veiculo (placa) - Menu 3 pontos com opcoes**

## Mudancas tecnicas

| Arquivo | Mudanca |
|---|---|
| `src/pages/Dashboard.tsx` | Quando houver alertas, o card ganha `col-span-2` (ou mais) para expandir no grid. Fundo muda de neutro para amarelo (`bg-amber-50 ring-amber-400 dark:bg-amber-950/30`). Remove o limite de 4 itens (`slice(0,4)`) e exibe todos os alertas com scroll. Reorganiza cada linha para mostrar Motorista - Veiculo - Opcoes (3 pontos). |

## Detalhes

- **Sem alertas**: card ocupa 1 coluna, fundo neutro, mostra apenas o numero "0"
- **Com alertas**: card ocupa `col-span-2` no grid, fundo amarelo/amber, lista todos os alertas com scroll (max-h maior)
- Cada item da lista: nome do motorista primeiro, depois placa do veiculo, depois menu de 3 pontos
- O grid de metricas continua com 5 colunas base, mas o card de combustivel se expande sobre a proxima coluna quando tem alertas
