

# Corrigir Coluna "Retornando para Base" no Localizador

## Problema

Atualmente, motoristas com missao **aceita** ou **pendente** cujo destino e a Base ja aparecem na coluna "Retornando para Base". Isso esta errado: o motorista so esta efetivamente retornando quando a missao foi **iniciada** (`em_andamento`).

Com missao apenas aceita, o motorista ainda esta no ponto onde se encontra fisicamente.

## Solucao

### `src/pages/PainelLocalizador.tsx`

**Linha 220** - Alterar o filtro de `retornandoBaseIds` para considerar apenas `em_andamento`:

De:
```typescript
if (missao.ponto_desembarque === baseNome && ['pendente', 'aceita', 'em_andamento'].includes(missao.status)) {
```

Para:
```typescript
if (missao.ponto_desembarque === baseNome && missao.status === 'em_andamento') {
```

Isso garante que:
- **Missao aceita com destino Base**: motorista fica na coluna da sua localizacao atual
- **Missao em_andamento com destino Base**: motorista aparece na coluna "Retornando para Base"
- **Missao pendente**: continua no fluxo separado de "Missoes Pendentes"

## Sobre aceitacao de missoes em qualquer ordem

Esse comportamento ja esta implementado. O sistema permite que o motorista aceite qualquer missao disponivel, independente do horario. A unica restricao e ter apenas uma missao ativa por vez (`aceita` ou `em_andamento`). A priorizacao por `horario_previsto` que implementamos e apenas para exibicao nos cards do Localizador, nao afeta a ordem de aceitacao no app do motorista.

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/PainelLocalizador.tsx` | Linha 220: filtrar retornandoBaseIds apenas por `em_andamento` |

1 linha alterada, 1 arquivo.

