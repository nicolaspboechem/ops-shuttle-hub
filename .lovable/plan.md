

# Melhorar Dashboard de Shuttle e App Operador

## Contexto

O `ShuttleMetrics` atual e muito basico (so mostra "Total Shuttles" e "Passageiros"). Precisa de KPIs mais completos e graficos relevantes. A aba de viagens do App Operador tambem precisa exibir PAX ida total e PAX volta total nos cards de resumo.

---

## 1. Reformular `ShuttleMetrics` (Dashboard CCO)

**Arquivo:** `src/components/shuttle/ShuttleMetrics.tsx`

Substituir os 2 cards simples por 4 KPIs relevantes:

| KPI | Calculo |
|-----|---------|
| **Passageiros Total** | `qtd_pax + qtd_pax_retorno` de todas as viagens |
| **Total Viagens** | Contagem total (ativas + encerradas) |
| **PAX Ida** | Soma de `qtd_pax` |
| **PAX Volta** | Soma de `qtd_pax_retorno` |

Layout: grid 4 colunas (desktop) / 2 colunas (mobile), estilo emerald consistente com o tema shuttle.

## 2. Criar grafico de PAX por hora para Shuttle

**Arquivo:** `src/components/shuttle/ShuttlePaxChart.tsx` (NOVO)

Grafico de barras empilhadas (recharts - ja instalado) mostrando:
- Eixo X: horas do dia (06h-23h)
- Barras empilhadas: PAX Ida (cor primaria) + PAX Volta (cor secundaria)
- Baseado nos dados de `h_inicio_real` (hora de criacao) e `h_fim_real` (hora de encerramento)

## 3. Criar grafico de viagens por dia

**Arquivo:** `src/components/shuttle/ShuttleViagensDiaChart.tsx` (NOVO)

Grafico de barras mostrando volume de viagens por dia do evento:
- Eixo X: datas (formato dd/MM)
- Barras: quantidade de viagens naquele dia
- Linha sobreposta: total de PAX por dia
- So aparece quando `verTodosDias` ou quando ha dados de multiplos dias

## 4. Integrar graficos na aba Shuttle do EventoTabs

**Arquivo:** `src/components/eventos/EventoTabs.tsx`

Na `TabsContent value="shuttle"`, apos `ShuttleMetrics` e antes de `ShuttleTable`, adicionar:
- `ShuttlePaxChart` (PAX por hora)
- `ShuttleViagensDiaChart` (viagens por dia, apenas quando ha dados de multiplos dias)

## 5. Melhorar summary cards do App Operador

**Arquivo:** `src/pages/app/AppOperador.tsx`

Alterar o grid de resumo de 2 cards para 4 cards (grid 2x2):

| Card atual | Card novo |
|------------|-----------|
| Ativas (Bus icon) | Viagens (total, com subtitle "X ativas") |
| PAX Total | PAX Ida (ArrowUp) |
| -- | PAX Volta (ArrowDown) |
| -- | PAX Total (Users, soma ida+volta, highlight) |

---

## Detalhes Tecnicos

### ShuttlePaxChart - logica de agrupamento por hora

```text
// Agrupar viagens por hora de inicio (h_inicio_real)
// Para cada hora: somar qtd_pax (ida) e qtd_pax_retorno (volta)
const dadosPorHora = viagens.reduce((acc, v) => {
  const hora = v.h_inicio_real 
    ? new Date(v.h_inicio_real).getHours() 
    : null;
  if (hora !== null) {
    acc[hora].paxIda += v.qtd_pax || 0;
    acc[hora].paxVolta += v.qtd_pax_retorno || 0;
    acc[hora].viagens += 1;
  }
  return acc;
}, inicializarHoras(6, 23));
```

### ShuttleViagensDiaChart - agrupamento por data

```text
// Agrupar por data_criacao (YYYY-MM-DD)
// Para cada dia: contar viagens e somar PAX total
```

### App Operador - novo summary

```text
const summary = {
  total: viagens.length,
  ativas: viagensAtivas.length,
  totalPaxIda: viagens.reduce((sum, v) => sum + (v.qtd_pax || 0), 0),
  totalPaxVolta: viagensEncerradas.reduce((sum, v) => sum + (v.qtd_pax_retorno || 0), 0),
};
// PAX Total = totalPaxIda + totalPaxVolta
```

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/shuttle/ShuttleMetrics.tsx` | Reformular com 4 KPIs (Total PAX, Viagens, PAX Ida, PAX Volta) |
| `src/components/shuttle/ShuttlePaxChart.tsx` | **NOVO** - Grafico barras empilhadas PAX por hora |
| `src/components/shuttle/ShuttleViagensDiaChart.tsx` | **NOVO** - Grafico viagens/PAX por dia |
| `src/components/eventos/EventoTabs.tsx` | Integrar novos graficos na aba shuttle |
| `src/pages/app/AppOperador.tsx` | Grid 2x2 com PAX Ida, PAX Volta, Total, Viagens |

Sem migracoes de banco necessarias. Usa recharts (ja instalado) e campos existentes.

