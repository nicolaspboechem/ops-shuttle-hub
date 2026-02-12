

# Atualizar status dos motoristas no Localizador para refletir estado de missoes

## Problema atual

1. **Status "Disponivel" permanente**: O card do Localizador exibe sempre "Disponivel" porque le o campo `motorista.status` do banco, que raramente muda para refletir missoes pendentes/aceitas.
2. **Badges de missao com baixo contraste**: As badges "Missao Pendente" e "Missao Aceita" no MapaServicoCard sao pequenas, com cores fracas, e geram confusao - deveriam SER o status principal.
3. **Falta de logica Online/Offline**: O Localizador ja filtra motoristas com check-in ativo, mas nao exibe "Online/Offline" como conceito visual.

## Nova logica de status

O status exibido no card sera **derivado** da combinacao de presenca + missao + status DB:

| Condicao | Status exibido | Cor |
|---|---|---|
| Check-in ativo, sem missao, status != em_viagem | **Disponivel** | Verde |
| Missao com status `pendente` | **Missao Pendente** | Amarelo |
| Missao com status `aceita` | **Missao Aceita** | Azul |
| Status `em_viagem` ou missao `em_andamento` | **Em Transito** | Azul intenso |
| Status `indisponivel` (manutencao manual) | **Indisponivel** | Vermelho |

## Mudancas

### 1. LocalizadorCard.tsx - Status derivado de missoes

**Receber missao como prop** e calcular o status exibido:

```tsx
interface LocalizadorCardProps {
  motorista: MotoristaComVeiculo;
  missao?: { status: string; ponto_embarque?: string; ponto_desembarque?: string } | null;
}
```

**Novo statusConfig** com 5 estados claros e alto contraste:
- `disponivel`: verde (bolinha verde + "Disponivel")
- `missao_pendente`: amarelo/amber (bolinha amarela + "Missao Pendente")
- `missao_aceita`: azul (bolinha azul + "Missao Aceita")
- `em_transito`: azul intenso (bolinha azul pulsante + "Em Transito")
- `indisponivel`: vermelho (bolinha vermelha + "Indisponivel")

**Logica de derivacao** dentro do componente:
```tsx
function getDisplayStatus(motorista, missao) {
  if (motorista.status === 'indisponivel') return 'indisponivel';
  if (motorista.status === 'em_viagem') return 'em_transito';
  if (missao?.status === 'em_andamento') return 'em_transito';
  if (missao?.status === 'aceita') return 'missao_aceita';
  if (missao?.status === 'pendente') return 'missao_pendente';
  return 'disponivel';
}
```

**Remover** as badges separadas de missao - o status principal ja comunica tudo. Manter apenas a rota (origem -> destino) quando existir missao com pontos.

### 2. LocalizadorColumn.tsx - Passar missao para o card

Receber um mapa de missoes por motorista:
```tsx
interface LocalizadorColumnProps {
  // ...existing
  missoesPorMotorista?: Map<string, { status: string; ponto_embarque?: string; ponto_desembarque?: string }>;
}
```

Passar para cada `LocalizadorCard`:
```tsx
<LocalizadorCard 
  motorista={motorista} 
  missao={missoesPorMotorista?.get(motorista.id)} 
/>
```

### 3. PainelLocalizador.tsx - Passar missoes para as colunas

O `PainelLocalizador` ja busca `missoesAtivas` e cria `missoesPorMotorista`. Basta passar esse mapa para cada `LocalizadorColumn`:

```tsx
<LocalizadorColumn
  titulo={local}
  motoristas={dynamicMotoristas[local] || []}
  tipo="local"
  missoesPorMotorista={missoesPorMotorista}
/>
```

### 4. ClienteLocalizadorTab.tsx - Buscar missoes e passar

Adicionar fetch de missoes ativas (igual ao PainelLocalizador) e passar o mapa para as colunas.

### 5. MapaServicoCard.tsx - Unificar status

Aplicar a mesma logica de status derivado: remover as badges separadas de missao (linhas 150-161) e fazer o status principal (Row 1) refletir o estado da missao. O status vira o indicador unico com cores de alto contraste.

Novo `statusConfig` no MapaServicoCard:
```tsx
const statusConfig = {
  disponivel: { label: 'Disponivel', color: 'bg-green-500', textColor: 'text-green-500' },
  missao_pendente: { label: 'Missao Pendente', color: 'bg-amber-500', textColor: 'text-amber-500' },
  missao_aceita: { label: 'Missao Aceita', color: 'bg-blue-500', textColor: 'text-blue-500' },
  em_transito: { label: 'Em Transito', color: 'bg-blue-600', textColor: 'text-blue-400' },
  indisponivel: { label: 'Indisponivel', color: 'bg-red-500', textColor: 'text-red-500' },
};
```

A rota (origem -> destino) continua exibida abaixo do status quando houver missao com pontos, mas sem a badge separada.

## Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/localizador/LocalizadorCard.tsx` | Receber prop `missao`, derivar status, remover badges separadas |
| `src/components/localizador/LocalizadorColumn.tsx` | Receber e repassar `missoesPorMotorista` |
| `src/pages/PainelLocalizador.tsx` | Passar `missoesPorMotorista` para cada `LocalizadorColumn` |
| `src/components/app/ClienteLocalizadorTab.tsx` | Buscar missoes ativas, passar mapa para colunas |
| `src/components/mapa-servico/MapaServicoCard.tsx` | Unificar status derivado, remover badges de missao separadas |

## Resultado

- Status unico e claro com 5 estados visiveis e alto contraste
- Sem badges pequenas e confusas de missao
- Atualizacao em tempo real via realtime (missoes ja tem subscription)
- Consistencia entre Localizador CCO, Localizador Cliente e Mapa de Servico

