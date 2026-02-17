

# Corrigir Modal de Alertas de Combustivel no App Supervisor

## Problemas Identificados

1. **Conteudo cortado**: O Sheet bottom usa `h-[80vh]` com padding `p-6` do componente base, mas o calculo do `max-h` interno nao desconta corretamente o padding + header
2. **Exibe apenas placa**: Mostra `alerta.veiculo?.placa` mas nao exibe o nome/apelido do veiculo (campo `nome` ja vem do banco)
3. **Botoes grandes demais para mobile**: 3 botoes com texto em `flex-1` ficam apertados em telas pequenas

## Alteracoes

### 1. `src/components/app/SupervisorAlertasModal.tsx`

**Exibir nome do veiculo + placa:**
- Linha 85: trocar `{alerta.veiculo?.placa || '---'}` por exibir nome como principal e placa entre parenteses
- De: `<code className="text-sm font-bold">{alerta.veiculo?.placa || '---'}</code>`
- Para: `<span className="text-sm font-bold">{alerta.veiculo?.nome || alerta.veiculo?.placa || '---'}</span>` + placa em texto secundario quando houver nome

**Corrigir dimensoes mobile:**
- Linha 62: Reduzir altura do Sheet de `h-[80vh]` para `max-h-[80vh]` para nao forcar altura fixa
- Linha 71: Ajustar `max-h` do scroll container para usar `flex-1 overflow-y-auto` em vez de calculo fixo
- Usar layout flex column no SheetContent para que header + conteudo se distribuam corretamente
- Botoes: reduzir padding e usar icones sem texto em telas muito pequenas, ou empilhar verticalmente

**Layout corrigido do SheetContent:**
- Adicionar `flex flex-col` ao className
- Trocar `max-h-[calc(80vh-100px)]` por `flex-1 min-h-0 overflow-y-auto` no container de alertas

| Local | De | Para |
|-------|-----|------|
| SheetContent (L62) | `h-[80vh] rounded-t-2xl` | `max-h-[80vh] rounded-t-2xl flex flex-col` |
| Scroll container (L71) | `mt-4 space-y-3 overflow-y-auto max-h-[calc(80vh-100px)] pb-4` | `mt-4 space-y-3 flex-1 min-h-0 overflow-y-auto pb-4` |
| Veiculo info (L85) | `alerta.veiculo?.placa \|\| '---'` | Nome principal + `(placa)` secundario |
| Botoes (L107-139) | `flex gap-2` com texto completo | `flex flex-wrap gap-2` com texto menor |

