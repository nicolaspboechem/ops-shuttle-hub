

# Simplificar App Operador Shuttle -- Apenas Contabilizar PAX

## Contexto

O shuttle do operador nao precisa rastrear tempo de viagem, pontos de embarque/desembarque, ciclo de vida (iniciar, chegada, retorno, encerrar). O objetivo e apenas **contabilizar** quantos shuttles foram feitos e quantos PAX transportados.

## Novo Fluxo

```text
Operador toca "+" --> Digita quantidade de PAX --> Toca "Registrar" --> Viagem criada como ENCERRADA --> Aparece na lista
```

Sem estados intermediarios. Sem swipe. Sem lifecycle.

## Alteracoes

### 1. Simplificar `CreateShuttleForm`

**Arquivo:** `src/components/app/CreateShuttleForm.tsx`

- Remover: Selects de ponto embarque/desembarque, campo de horario
- Manter: Campo PAX (obrigatorio), Observacao (opcional)
- Insert: Gravar com `status: 'encerrado'`, `encerrado: true`, `h_inicio_real` e `h_fim_real` iguais (instantaneo)
- Remover: import de `usePontosEmbarque`, `Select` components, estados de pontoEmbarqueId/pontoDesembarqueId/horario
- `canSave` passa a ser apenas `qtdPax && Number(qtdPax) > 0`

### 2. Simplificar `AppOperador` (tela principal)

**Arquivo:** `src/pages/app/AppOperador.tsx`

- Remover: Grid de 4 status cards (agendado, em_andamento, aguardando_retorno, encerrado)
- Remover: `statusFilter` state e logica de filtragem por status
- Remover: `useViagemOperacaoStaff` (nao ha mais lifecycle)
- Remover: import de `ViagemCardOperador` (card complexo com swipe)
- Adicionar: Card simples de resumo no topo (Total Shuttles, Total PAX)
- Adicionar: Lista simples de shuttles registrados -- cada item mostra PAX, horario, observacao, quem criou
- Manter: DiaSeletor, PullToRefresh, tabs (viagens, historico, mais)

### 3. Criar card simples para shuttle registrado

**Arquivo:** Novo componente inline no AppOperador ou componente separado `ShuttleRegistroCard`

Cada shuttle aparece como um card compacto:
```text
+-------------------------------------------+
| 12 PAX          14:32    por João Silva    |
| Obs: Saída do hotel principal              |
+-------------------------------------------+
```

Sem botoes de acao. Sem swipe. Apenas informacao.

### 4. Atualizar `ShuttleMetrics` (dashboard CCO)

**Arquivo:** `src/components/shuttle/ShuttleMetrics.tsx`

- Remover: Card "Tempo Medio Ciclo" (nao ha mais tracking de tempo)
- Remover: Card "Frota" (shuttle nao tem veiculo vinculado)
- Manter: Card "Total Shuttles" e Card "Passageiros"
- Ajustar: "em andamento" deixa de existir para shuttle simplificado

### 5. Atualizar `ShuttleTable` (dashboard CCO)

**Arquivo:** `src/components/shuttle/ShuttleTable.tsx`

- Remover colunas: Motorista, Veiculo, Pickup, Chegada, Retorno, Tempo Ciclo
- Manter/adicionar: Horario registro, PAX, Observacao, Criado por
- Simplificar Badge de situacao (tudo sera "Registrado")

## Arquivos Alterados

| Arquivo | Tipo |
|---------|------|
| `src/components/app/CreateShuttleForm.tsx` | Simplificar (remover pontos, horario) |
| `src/pages/app/AppOperador.tsx` | Simplificar (remover lifecycle, status cards) |
| `src/components/shuttle/ShuttleMetrics.tsx` | Remover cards irrelevantes |
| `src/components/shuttle/ShuttleTable.tsx` | Simplificar colunas |

## Impacto no Banco

Nenhuma alteracao de schema. Os campos `ponto_embarque`, `ponto_desembarque`, `h_pickup`, etc. simplesmente nao serao preenchidos para shuttles criados pelo operador. Os dados existentes permanecem intactos.

## Dados gravados por shuttle

```text
evento_id, tipo_operacao='shuttle', motorista='Shuttle',
status='encerrado', encerrado=true,
qtd_pax, observacao, criado_por,
h_inicio_real=agora, h_fim_real=agora
```
