

# Plano de Melhoria do Schema e Limpeza do Codigo

## Diagnostico Atual (dados reais)

| Metrica | Valor |
|---------|-------|
| Total viagens | 4.715 (todas encerradas) |
| Viagens sem `motorista_id` (legado) | 2.971 (63%) |
| Viagens sem `veiculo_id` (legado) | 474 |
| Vinculos motorista-veiculo inconsistentes | 0 |
| Presencas duplicadas ativas | 0 |
| Status motoristas | `indisponivel` (51), `disponivel` (18) |
| Status veiculos | `liberado` (41), `em_inspecao` (16) |

O banco esta saudavel neste momento, mas ha debito tecnico acumulado que precisa ser resolvido para evitar problemas futuros.

---

## Fase 1 - Migrations de Schema (Banco de Dados)

### 1.1 Trigger de Sincronizacao Legado para FK (viagens)

Criar trigger `BEFORE INSERT OR UPDATE` em `viagens` que preenche automaticamente os campos varchar (`motorista`, `placa`, `tipo_veiculo`) a partir das FKs (`motorista_id`, `veiculo_id`). Isso garante que qualquer insert feito com FKs tambem popula os campos legados, eliminando divergencias.

### 1.2 Backfill de FKs em viagens historicas

Rodar UPDATE para preencher `motorista_id` e `veiculo_id` nas 2.971 + 474 viagens que so tem dados legados, cruzando pelo campo `motorista` (nome) e `placa` dentro do mesmo `evento_id`.

### 1.3 Constraint parcial para presenca ativa unica

```sql
CREATE UNIQUE INDEX idx_presenca_ativa_unica
  ON motorista_presenca (motorista_id, evento_id, data)
  WHERE checkout_at IS NULL;
```

Previne duplicatas de check-in ativo sem impedir multiplos shifts (registros com checkout preenchido).

### 1.4 CHECK constraints para status

```sql
ALTER TABLE motoristas ADD CONSTRAINT chk_motorista_status
  CHECK (status IN ('disponivel','em_viagem','indisponivel','inativo'));

ALTER TABLE veiculos ADD CONSTRAINT chk_veiculo_status
  CHECK (status IN ('em_inspecao','liberado','abastecimento','manutencao'));

ALTER TABLE viagens ADD CONSTRAINT chk_viagem_status
  CHECK (status IN ('agendado','em_andamento','aguardando_retorno','encerrado','cancelado'));
```

### 1.5 alertas_frota.motorista_id tornado nullable

Permitir alertas de veiculo sem motorista vinculado (ex: alerta de manutencao sem motorista).

---

## Fase 2 - Limpeza do Frontend (Codigo)

### 2.1 Formularios de criacao de viagem - usar `.select('id')` no insert

Atualmente `CreateViagemForm` e `CreateViagemMotoristaForm` fazem um segundo SELECT para buscar o ID da viagem recem-criada (filtro por nome + h_pickup). Isso e fragil. Alterar para usar `.insert().select('id').single()` que retorna o ID diretamente.

**Arquivos afetados:**
- `src/components/app/CreateViagemForm.tsx` (linhas 148-200)
- `src/components/app/CreateViagemMotoristaForm.tsx` (linhas 150-215)

### 2.2 Remover escrita legada redundante nos inserts

Com o trigger da Fase 1.1, os campos `motorista`, `placa`, `tipo_veiculo` serao preenchidos automaticamente pelo banco. Remover essas linhas dos inserts no frontend para simplificar o codigo.

**Arquivos afetados (6 pontos de insert):**
- `src/components/app/CreateViagemForm.tsx`
- `src/components/app/CreateViagemMotoristaForm.tsx`
- `src/components/app/RetornoViagemForm.tsx`
- `src/components/app/CreateShuttleForm.tsx`
- `src/hooks/useMissoes.ts`
- `src/pages/app/AppMotorista.tsx`

### 2.3 Remover sync legado em useCadastros

O hook `useCadastros` faz `UPDATE viagens SET motorista = X WHERE motorista = oldNome` e equivalente para placa ao renomear motorista/veiculo. Com o trigger, isso se torna desnecessario (os campos legados derivam das FKs). Remover essas queries de sincronizacao.

**Arquivo:** `src/hooks/useCadastros.ts`

### 2.4 Corrigir queries que filtram por campo legado

- `useViagemOperacao.ts` (linha 86): fallback `.eq('motorista', motoristaNome)` - remover o fallback, usar apenas `motorista_id`
- `VeiculoDetalheModal.tsx` (linha 166): busca por `.eq('placa', ...)` como fallback - simplificar para usar apenas `veiculo_id`

### 2.5 CreateShuttleForm - adicionar motorista_id para shuttle

O `CreateShuttleForm` insere `motorista: 'Shuttle'` como texto fixo sem FK. Manter esse comportamento (shuttle nao tem motorista real), mas adicionar um comentario explicativo.

---

## Fase 3 - Indices de Performance

Criar indices para as queries mais frequentes que nao tem indice dedicado:

```sql
CREATE INDEX IF NOT EXISTS idx_viagens_evento_encerrado 
  ON viagens (evento_id, encerrado) WHERE encerrado = false;

CREATE INDEX IF NOT EXISTS idx_viagens_motorista_id 
  ON viagens (motorista_id) WHERE motorista_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_viagens_veiculo_id 
  ON viagens (veiculo_id) WHERE veiculo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presenca_ativa 
  ON motorista_presenca (motorista_id, evento_id, data) 
  WHERE checkout_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vistoria_evento_tipo 
  ON veiculo_vistoria_historico (evento_id, tipo_vistoria);
```

---

## Sequencia de Execucao

| Ordem | Acao | Risco |
|-------|------|-------|
| 1 | Migration: Trigger sync legado (1.1) | Nenhum - aditivo |
| 2 | Migration: Indices de performance (Fase 3) | Nenhum - aditivo |
| 3 | Migration: Constraint presenca unica (1.3) | Baixo - ja verificado sem duplicatas |
| 4 | Migration: CHECK constraints status (1.4) | Baixo - valores ja validados |
| 5 | Migration: motorista_id nullable em alertas (1.5) | Nenhum |
| 6 | Data: Backfill FKs historicas (1.2) | Nenhum - UPDATE em dados encerrados |
| 7 | Codigo: Simplificar inserts (2.1, 2.2) | Baixo - trigger garante compatibilidade |
| 8 | Codigo: Remover syncs legados (2.3, 2.4) | Baixo |

## Arquivos modificados no total

**Migrations (SQL):** 1 migration com todas as alteracoes de schema

**Frontend (6 arquivos):**
- `src/components/app/CreateViagemForm.tsx`
- `src/components/app/CreateViagemMotoristaForm.tsx`
- `src/components/app/RetornoViagemForm.tsx`
- `src/hooks/useMissoes.ts`
- `src/pages/app/AppMotorista.tsx`
- `src/hooks/useCadastros.ts`
- `src/hooks/useViagemOperacao.ts`
- `src/components/veiculos/VeiculoDetalheModal.tsx`

