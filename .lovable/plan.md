

# Corrigir Localizador: Filtrar por Data Operacional + Coluna de Missoes Pendentes

## Status: ✅ IMPLEMENTADO

## Problema

1. O Painel Localizador busca missoes ativas **sem filtrar por data operacional**, causando missoes antigas (de dias anteriores) aparecendo no painel e gerando inconsistencias de rota.
2. Missoes pendentes nao tem visibilidade propria - ficam misturadas nos cards dos motoristas, dificultando a operacao.

## Solucao Implementada

### 1. Filtro por data operacional
- Query de missoes agora filtra por `data_programada` = dia operacional atual OU null (imediatas)
- Busca `horario_virada_dia` do evento para calculo correto
- Prioridade: `em_andamento` > `aceita`, desempate por `created_at` mais recente

### 2. Coluna "Missoes Pendentes"
- Coluna fixa amarela com icone Clock exibe motoristas com missao pendente (sem missao ativa)
- Stat no header mostra contagem de pendentes
- Cards reutilizam LocalizadorCard com missao pendente

### 3. Tipo `pendente` no LocalizadorColumn
- Cor yellow-500, icone Clock

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/PainelLocalizador.tsx` | Filtro por data operacional + coluna de pendentes + stat pendentes |
| `src/components/localizador/LocalizadorColumn.tsx` | Novo tipo `pendente` no columnConfig |
