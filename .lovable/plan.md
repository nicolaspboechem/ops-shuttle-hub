

# Ranking de Motoristas e Veiculos na Auditoria

## Objetivo
Adicionar tabelas de ranking diretamente na aba **Resumo Geral** da Auditoria (como no dashboard), com ordenacao decrescente por numero de viagens e PAX como criterio de desempate. Isso servira como base para a premiacao dos motoristas.

## Alteracoes

### 1. `src/components/auditoria/AuditoriaResumoTab.tsx`

Adicionar duas novas tabelas apos os graficos e antes da tabela de pontos:

**Tabela "Ranking de Motoristas":**
- Coluna `#` (posicao no ranking, comecando em 1)
- Coluna `Motorista`
- Coluna `Total Viagens`
- Coluna `Total PAX`
- Coluna `Media PAX/Viagem`
- Ordenacao: viagens DESC, PAX DESC como desempate
- Destaque visual nas 3 primeiras posicoes (medalha ou badge dourado/prata/bronze)

**Tabela "Ranking de Veiculos":**
- Coluna `#` (posicao)
- Coluna `Placa`
- Coluna `Tipo`
- Coluna `Total Viagens`
- Coluna `Total PAX`
- Mesma logica de ordenacao

Ambas com botao de exportar Excel.

### 2. `src/components/auditoria/AuditoriaMotoristasTab.tsx`

Corrigir o `.sort()` para usar PAX como criterio de desempate:
```
.sort((a, b) => b.viagens - a.viagens || b.pax - a.pax)
```
Adicionar coluna `#` com posicao no ranking.

### 3. `src/components/auditoria/AuditoriaVeiculosTab.tsx`

Mesma correcao de sort com desempate por PAX e coluna `#`.

## Detalhes visuais

- Top 3 motoristas com icone de medalha (Trophy) ou badge colorido para facilitar identificacao visual na premiacao
- Posicao 1: dourado, Posicao 2: prata, Posicao 3: bronze
- As tabelas no Resumo sao versoes compactas (mesmos dados, mesmo layout)

## Arquivos modificados
1. `src/components/auditoria/AuditoriaResumoTab.tsx` - adicionar tabelas de ranking de motoristas e veiculos
2. `src/components/auditoria/AuditoriaMotoristasTab.tsx` - corrigir sort com desempate por PAX, adicionar coluna #
3. `src/components/auditoria/AuditoriaVeiculosTab.tsx` - corrigir sort com desempate por PAX, adicionar coluna #
