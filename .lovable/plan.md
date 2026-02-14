

# Exibir Tempo por Status em Todos os Cards do Localizador

## O que muda

Atualmente, o tempo ("ha X minutos") so aparece para motoristas com status **Disponivel**. Com esta alteracao, cada status tera seu proprio tempo visivel:

- **Disponivel**: tempo desde a ultima atualizacao de localizacao (comportamento atual)
- **Missao Pendente**: tempo desde que a missao foi criada (quanto tempo esta pendente)
- **Missao Aceita**: tempo desde que a missao foi aceita (usa `data_atualizacao` da missao)
- **Em Transito**: tempo desde que a viagem/missao iniciou (usa `data_atualizacao` da missao)

## Detalhes tecnicos

### 1. Query - adicionar `data_atualizacao` (`PainelLocalizador.tsx`, linha 87)

Incluir o campo `data_atualizacao` na query de missoes:
```
.select('id, motorista_id, ponto_embarque, ponto_desembarque, status, created_at, horario_previsto, data_atualizacao')
```

### 2. Interface da missao no card (`LocalizadorCard.tsx`)

Expandir a interface `missao` para incluir os novos campos:
```typescript
missao?: {
  status: string;
  ponto_embarque?: string;
  ponto_desembarque?: string;
  created_at?: string | null;
  data_atualizacao?: string | null;
} | null;
```

### 3. Logica de tempo por status (`LocalizadorCard.tsx`)

Substituir a logica atual (linhas 40-57) por uma que calcula o tempo baseado no status:

- `disponivel` -> usa `motorista.ultima_localizacao_at`
- `missao_pendente` -> usa `missao.created_at` (quando a missao foi criada)
- `missao_aceita` -> usa `missao.data_atualizacao` (quando mudou para aceita)
- `em_transito` -> usa `missao.data_atualizacao` (quando mudou para em_andamento)

Remover a condicao `displayStatus === 'disponivel'` da linha 56, passando a exibir o tempo em todos os status.

### 4. Interface `LocalizadorColumn.tsx`

Atualizar o tipo do `missoesPorMotorista` para incluir os novos campos, garantindo que `created_at` e `data_atualizacao` fluam ate o card.

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/PainelLocalizador.tsx` | Adicionar `data_atualizacao` na query |
| `src/components/localizador/LocalizadorCard.tsx` | Interface + logica de tempo por status |
| `src/components/localizador/LocalizadorColumn.tsx` | Atualizar tipo da prop missoesPorMotorista |

