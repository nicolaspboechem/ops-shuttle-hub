

# Sincronizar Mapa de Servico com Painel Localizador

## Problema

O Mapa de Servico (aba Localizacao) e o Painel Localizador usam logicas diferentes para agrupar motoristas nas colunas. O Localizador e o padrao correto. As diferencas encontradas:

| Aspecto | Localizador (correto) | Mapa de Servico (incorreto) |
|---------|----------------------|---------------------------|
| Missoes no mapa | Exclui `pendente` do mapa de missoes por motorista | Inclui `pendente` no mapa |
| Filtro por dia operacional | Filtra missoes por `data_programada` do dia operacional | Nao filtra por dia -- usa TODAS as missoes ativas |
| Coluna "Outros" | So move se missao `aceita` ou `em_andamento` | Move tambem se missao `pendente` |
| Em Transito por missao | Motorista com missao `em_andamento` vai para Em Transito | Ignora missao, usa apenas `m.status === 'em_viagem'` |
| Coluna Missoes Pendentes | Existe como coluna fixa | Nao existe |

Essas diferencas fazem com que um motorista como Marlon apareca em colunas diferentes nos dois paineis.

## Solucao

Reescrever a logica de agrupamento do `MapaServico.tsx` para replicar exatamente a do `PainelLocalizador.tsx`:

### 1. Buscar missoes com filtro de dia operacional

Atualmente o MapaServico usa `useMissoes(eventoId).missoesAtivas` que traz TODAS as missoes ativas sem filtrar por dia. Substituir por uma busca propria (como o Localizador faz) que filtra por `data_programada`:

```text
// Buscar missoes filtradas pelo dia operacional
const dataOp = getDataOperacional(new Date(), horarioVirada);
supabase.from('missoes')
  .select('id, motorista_id, ponto_embarque, ponto_desembarque, status, ...')
  .eq('evento_id', eventoId)
  .in('status', ['pendente', 'aceita', 'em_andamento'])
  .or(`data_programada.eq.${dataOp},data_programada.is.null`)
```

### 2. Excluir `pendente` do mapa de missoes por motorista

No `missoesPorMotorista`, pular missoes com status `pendente` (igual ao Localizador linha 163):

```text
missoesAtivas.forEach(m => {
  if (m.status === 'pendente') return;  // ADICIONAR
  ...
});
```

### 3. Ajustar logica de "Outros" para excluir `pendente`

Mudar de `['pendente', 'aceita', 'em_andamento']` para `['aceita', 'em_andamento']`.

### 4. Adicionar logica de "Em Transito por missao"

Motorista com missao `em_andamento` (que nao seja retorno a base) deve ir para "Em Viagem", igual ao Localizador:

```text
const emTransitoPorMissao = missao?.status === 'em_andamento';
// ...
} else if (emTransitoPorMissao && loc !== 'em_transito') {
  emViagem.push(m);
}
```

### 5. Adicionar coluna "Missoes Pendentes"

Criar a mesma logica de `motoristasPendentes` e `missoesPendentesPorMotorista` do Localizador e renderizar como coluna fixa no lado direito.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MapaServico.tsx` | Reescrever logica de missoes e agrupamento para espelhar PainelLocalizador; adicionar busca com filtro de dia operacional; adicionar coluna de Missoes Pendentes |

## Resultado

- Ambos os paineis exibirao os mesmos motoristas nas mesmas colunas
- Motorista com missao `pendente` (sem iniciar) permanece na sua coluna de localizacao atual
- Motorista so muda de coluna quando a missao esta `aceita` ou `em_andamento`
- Coluna de Missoes Pendentes aparece no Mapa de Servico para visibilidade

