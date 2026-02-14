

# Coluna "Outros" para Missoes com Origem ou Destino "Outros" + Filtros de Missoes

## Problema

Quando um motorista tem uma missao em andamento com origem OU destino "Outros", ele aparece na coluna "Em Transito" em vez de "Outros". A regra correta e: **se a missao ativa envolve "Outros" em qualquer ponta (embarque ou desembarque), o motorista deve aparecer na coluna "Outros"**.

## Alteracoes

### 1. MapaServico.tsx - Roteamento para "Outros"

Na logica de agrupamento (linhas 155-168), antes de colocar o motorista em `emViagem`, verificar se a missao ativa tem `ponto_embarque` ou `ponto_desembarque` igual a `outrosNome`. Se sim, colocar na coluna `outros`.

Logica atual:
```text
if (em_viagem) -> emViagem
else if (retornando) -> retornando
else if (localizacao === outrosNome) -> outros
```

Logica corrigida:
```text
if (retornando) -> retornando
else if (missao envolve outrosNome no embarque OU desembarque) -> outros
else if (em_viagem) -> emViagem
else if (localizacao === outrosNome) -> outros
```

### 2. PainelLocalizador.tsx - Mesma correcao

Na logica de agrupamento (linhas 233-252), aplicar a mesma verificacao: antes de mover para `em_transito` por causa de missao `em_andamento`, checar se `ponto_embarque` ou `ponto_desembarque` e "Outros". Se for, colocar na coluna `outros`.

Logica atual:
```text
if (retornando) -> retornando
else if (emTransitoPorMissao) -> em_transito
else if (localizacao === outrosNome) -> outros
```

Logica corrigida:
```text
if (retornando) -> retornando
else if (missao envolve outrosNome no embarque OU desembarque) -> outros
else if (emTransitoPorMissao) -> em_transito
else if (localizacao === outrosNome) -> outros
```

### 3. MissoesPanel.tsx - Filtros por Ponto A e Ponto B

Adicionar dois novos filtros Select ao painel de missoes:

- **Ponto A (Embarque)**: dropdown com valores unicos de `ponto_embarque` extraidos dos pontos de embarque cadastrados
- **Ponto B (Desembarque)**: dropdown com valores unicos de `ponto_desembarque` extraidos dos pontos de embarque cadastrados

Novos estados:
```text
const [missaoPontoAFilter, setMissaoPontoAFilter] = useState('all');
const [missaoPontoBFilter, setMissaoPontoBFilter] = useState('all');
```

Filtro aplicado no `filteredMissoes`:
```text
if (missaoPontoAFilter !== 'all')
  filtered = filtered.filter(m => m.ponto_embarque === missaoPontoAFilter);
if (missaoPontoBFilter !== 'all')
  filtered = filtered.filter(m => m.ponto_desembarque === missaoPontoBFilter);
```

As opcoes virao de `pontosEmbarque` (ja carregado via `usePontosEmbarque`), garantindo que os nomes sejam consistentes.

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MapaServico.tsx` | Priorizar coluna "Outros" quando missao envolve outrosNome (embarque ou desembarque) |
| `src/pages/PainelLocalizador.tsx` | Mesma correcao de roteamento |
| `src/components/motoristas/MissoesPanel.tsx` | Adicionar filtros Select por Ponto A e Ponto B |

