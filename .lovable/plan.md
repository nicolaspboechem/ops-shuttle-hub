
# Exibir Horario da Missao na Rota do Localizador

## Mudanca

Adicionar o campo `horario_previsto` da missao ao lado da rota nos cards do Localizador, exibindo algo como "10:30 Jockey -> GIG".

## Alteracoes

### 1. `src/pages/PainelLocalizador.tsx`
- Na query `fetchMissoes` (linha 87), adicionar `horario_previsto` ao SELECT:
  `'id, motorista_id, ponto_embarque, ponto_desembarque, status, created_at, horario_previsto'`

### 2. `src/components/localizador/LocalizadorCard.tsx`
- Expandir a interface da prop `missao` para incluir `horario_previsto?: string | null`
- No bloco da rota (linha 85-90), exibir o horario formatado (HH:mm) antes da rota quando disponivel
- Usar um icone `Clock` pequeno ao lado do horario para clareza visual

Visual resultante no card:
```
[Clock] 10:30  Jockey -> GIG
```

2 arquivos alterados, mudancas minimas.
