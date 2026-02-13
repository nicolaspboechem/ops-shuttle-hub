
# Correcao: Exclusao de motorista + Mesmo telefone em multiplos eventos

## Problema 1: Erro 409 ao excluir motorista

Duas foreign keys na tabela `viagens` e `alertas_frota` ainda usam o comportamento padrao `RESTRICT`, que bloqueia a exclusao do motorista quando existem registros associados.

FKs que bloqueiam:
- `viagens.motorista_id` -> RESTRICT (precisa virar SET NULL)
- `alertas_frota.motorista_id` -> RESTRICT (precisa virar SET NULL)

As demais FKs ja estao corretas (CASCADE ou SET NULL).

## Problema 2: Mesmo telefone em multiplos eventos

A Edge Function `driver-register` verifica se o telefone ja existe na tabela `motorista_credenciais` de forma **global**. Se o motorista "Nicolas" com telefone "22996031100" ja esta cadastrado no evento "Rio Open", ao tentar cadastra-lo no evento "TESTE" com o mesmo telefone, da 409.

A solucao e permitir que o mesmo telefone exista em `motorista_credenciais` desde que seja para **motoristas diferentes** (cada evento tem seu proprio registro de motorista). O `driver-login` ja busca por telefone e retorna o primeiro ativo - isso precisa ser ajustado para perguntar qual evento ou retornar o mais recente.

## Mudancas

### 1. Migracao SQL - Corrigir FKs restantes

```sql
ALTER TABLE viagens 
  DROP CONSTRAINT viagens_motorista_id_fkey,
  ADD CONSTRAINT viagens_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

ALTER TABLE alertas_frota 
  DROP CONSTRAINT alertas_frota_motorista_id_fkey,
  ADD CONSTRAINT alertas_frota_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;
```

### 2. Edge Function `driver-register` - Permitir mesmo telefone em eventos diferentes

Remover a verificacao global de telefone duplicado. Como cada motorista tem seu proprio `motorista_id` (mesmo que o nome/telefone seja igual), a unicidade ja e garantida pelo `motorista_id` na tabela `motorista_credenciais`.

A verificacao atual bloqueia cadastros legitimos. A unica restricao necessaria e: um `motorista_id` so pode ter uma credencial (isso ja e verificado e faz upsert).

### 3. Edge Function `driver-login` - Lidar com multiplas credenciais

Quando o telefone aparece em mais de uma credencial (motorista em multiplos eventos), o login precisa retornar a credencial mais recente ou a do evento ativo. Verificar e ajustar a logica de busca.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | SET NULL nas FKs de viagens e alertas_frota |
| `supabase/functions/driver-register/index.ts` | Remover bloqueio global de telefone duplicado |
| `supabase/functions/driver-login/index.ts` | Ajustar para lidar com multiplas credenciais do mesmo telefone |
| `src/hooks/useCadastros.ts` | Limpar credenciais antes do delete (safety net) |
| `src/lib/version.ts` | Atualizar para 1.7.7 |

## Resultado

- Excluir motorista funciona sem erro 409 em qualquer cenario
- Mesmo telefone pode ser cadastrado em motoristas de eventos diferentes
- Login do motorista continua funcionando corretamente
