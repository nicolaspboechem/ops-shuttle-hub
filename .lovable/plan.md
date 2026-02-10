

# Corrigir dados incompletos em viagens criadas por missao e exibicao no modal de detalhes

## Diagnostico

Ao analisar a viagem do Lorran (ID `fc8d2391`), identifiquei **3 bugs distintos** que explicam os dados faltando no print:

### Bug 1: Missao nao preenche campos legados ao criar viagem
Quando o motorista inicia uma missao (AppMotorista.tsx, linha 163-184), o `INSERT` na tabela `viagens` **nao popula**:
- `placa` -- campo legado de texto (por isso "Veiculo: -" no print)
- `tipo_veiculo` -- campo legado de texto
- `qtd_pax` -- valor da missao (por isso "PAX: 0")

O `veiculo_id` FK e definido corretamente, mas os campos de texto ficam NULL. Compare com o `CreateViagemMotoristaForm` (linha 152-153) que preenche ambos.

**Dados no banco confirmam:**
```text
veiculo_id: 5c18895b... (KIA SPORTAGE CINZA, SUL0H29, SUV)
placa: NULL
tipo_veiculo: NULL
qtd_pax: 0
```

### Bug 2: Formato de hora errado no modal PresencaDiaModal
A linha 274 usa `viagem.h_pickup?.substring(11, 16)`, que espera datetime ISO (`2026-02-10T10:48:19` -> pos 11-16 = `10:48`). Porem `h_pickup` e armazenado como `"10:48:19"` (so hora), entao `substring(11, 16)` retorna string vazia = "--:--".

### Bug 3: Modal nao usa dados do JOIN de veiculo
O `useViagens` faz JOIN com veiculos (`veiculo:veiculos!veiculo_id (nome, placa, tipo_veiculo)`), mas o `PresencaDiaModal` le apenas `v.placa` (campo legado). Quando o campo legado e NULL mas o FK existe, o veiculo nao aparece.

## Correcoes

### 1. Preencher campos legados na criacao de viagem por missao

**Arquivo**: `src/pages/app/AppMotorista.tsx` (linhas 156-182)

Antes do insert, buscar dados do veiculo vinculado e preencher:
- `placa: veiculo?.placa || null`
- `tipo_veiculo: veiculo?.tipo_veiculo || null`
- `qtd_pax: missao.qtd_pax || 0`

```text
// Buscar dados do veiculo vinculado
const veiculoData = veiculos.find(v => v.id === veiculoVinculado);

const { data: novaViagem, error } = await supabase
  .from('viagens')
  .insert({
    ...
    placa: veiculoData?.placa || null,
    tipo_veiculo: veiculoData?.tipo_veiculo || null,
    qtd_pax: missao.qtd_pax || 0,
    ...
  })
```

Isso requer que a lista `veiculos` esteja disponivel no componente (ja existe o hook `useVeiculos`).

### 2. Corrigir extracao de hora no PresencaDiaModal

**Arquivo**: `src/components/motoristas/PresencaDiaModal.tsx` (linha 274)

Alterar de:
```text
{viagem.h_pickup?.substring(11, 16) || '--:--'}
```
Para:
```text
{viagem.h_pickup?.substring(0, 5) || '--:--'}
```

O campo `h_pickup` armazena `"HH:mm:ss"`, entao `substring(0, 5)` extrai `"10:48"` corretamente.

Mesma correcao nos campos de periodo de veiculo (linhas 221, 225) que tambem usam `substring(11, 16)`.

### 3. Usar dados do JOIN de veiculo como fallback

**Arquivo**: `src/components/motoristas/PresencaDiaModal.tsx`

No bloco de veiculos utilizados (linha 73-98), alterar para usar o JOIN quando `v.placa` for null:

```text
viagens.forEach(v => {
  const placa = v.placa || (v as any).veiculo?.placa;
  const tipoVeiculo = v.tipo_veiculo || (v as any).veiculo?.tipo_veiculo;
  if (!placa) return;
  // ... resto da logica
});
```

Na tabela de viagens (linha 285-289), mesmo fallback:
```text
{viagem.placa || (viagem as any).veiculo?.placa ? (
  <code>...</code>
) : '-'}
```

### 4. Ampliar tipo Viagem para incluir dados do JOIN (opcional, mais limpo)

**Arquivo**: `src/lib/types/viagem.ts`

Adicionar campo opcional para o JOIN:
```text
export interface Viagem {
  ...
  // Dados do JOIN (preenchido pelo useViagens)
  veiculo?: {
    nome: string | null;
    placa: string | null;
    tipo_veiculo: string | null;
  } | null;
}
```

Isso elimina a necessidade de `(v as any)` e da type safety adequada.

## Resultado esperado

- Modal de detalhes do motorista mostra hora correta (ex: "10:48" em vez de "--:--")
- Veiculo aparece corretamente mesmo quando trip vem de missao (ex: "SUL0H29 - SUV")
- PAX reflete o valor da missao (nao zero)
- Dashboard e tabelas de viagens tambem se beneficiam dos campos legados preenchidos
- Viagens futuras criadas por missao ja virao com todos os dados completos
