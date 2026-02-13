
# Correcao: Desvinculacao de veiculo nao funciona corretamente

## Problema

O supervisor desvincula o veiculo pelo app, mas o motorista continua vendo o veiculo antigo. O banco de dados confirma que o motorista Rafael Santos **ainda tem** `veiculo_id` apontando para o veiculo TKB0J35.

## Causa Raiz

Existem **3 fluxos de desvinculacao** no sistema, e apenas 1 funciona corretamente:

| Fluxo | Limpa motoristas.veiculo_id | Limpa veiculos.motorista_id | Status |
|---|---|---|---|
| Pagina VincularVeiculo (handleDesvincular) | Sim | Sim | OK |
| Supervisor swipe/menu (handleUnlinkVehicle) | Sim | **NAO** | BUG |
| Auto-checkout (Edge Function) | Sim (v1.7.2) | **NAO** | BUG |

O fluxo do supervisor (`SupervisorFrotaTab.tsx` linha 96-111) so atualiza a tabela `motoristas` mas esquece de limpar `motorista_id` na tabela `veiculos`. Isso causa inconsistencia: quando o supervisor vincula um novo veiculo, o sistema pode nao detectar que o veiculo antigo ainda "acha" que pertence ao motorista.

## Correcoes

### 1. SupervisorFrotaTab.tsx - Desvinculacao bidirecional

Adicionar limpeza do `motorista_id` na tabela `veiculos` quando o supervisor desvincula:

```text
// ANTES (linha 96-111):
const handleUnlinkVehicle = async (motorista) => {
  await supabase.from('motoristas').update({ veiculo_id: null }).eq('id', motorista.id);
};

// DEPOIS:
const handleUnlinkVehicle = async (motorista) => {
  // 1. Limpar veiculo_id do motorista
  await supabase.from('motoristas').update({ veiculo_id: null }).eq('id', motorista.id);
  // 2. Limpar motorista_id do veiculo (bidirecional)
  if (motorista.veiculo_id) {
    await supabase.from('veiculos').update({ motorista_id: null }).eq('id', motorista.veiculo_id);
  }
};
```

### 2. Edge Function auto-checkout/index.ts - Limpar veiculos tambem

Apos setar `veiculo_id: null` nos motoristas, tambem limpar `motorista_id` nos veiculos correspondentes:

```text
// Apos o update de motoristas, adicionar:
await supabase.from('veiculos')
  .update({ motorista_id: null })
  .in('motorista_id', motoristaIds)
  .eq('evento_id', evento.id);
```

### 3. Correcao imediata - Desvincular Rafael Santos via codigo

Limpar os dados residuais no banco usando o insert tool:

```sql
UPDATE motoristas SET veiculo_id = NULL WHERE id = 'e091cbcf-d325-4aeb-8440-a52bf89b27d9';
UPDATE veiculos SET motorista_id = NULL WHERE id = 'f37a0f47-858f-4897-a3b6-8c628c6c1e03';
```

### 4. Versao

Atualizar `APP_VERSION` para `1.7.3`.

## Resumo de arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/app/SupervisorFrotaTab.tsx` | Adicionar limpeza bidirecional no handleUnlinkVehicle |
| `supabase/functions/auto-checkout/index.ts` | Limpar motorista_id nos veiculos durante virada |
| `src/lib/version.ts` | Atualizar para 1.7.3 |
| Banco de dados | Desvincular Rafael Santos imediatamente |
