

# Plano: Auditoria de Ponto dos Motoristas - Redesign Completo

---

## 1. Diagnostico dos Dados (Supabase)

### Tabela e campos

A tabela `motorista_presenca` armazena os registros de ponto:
- `checkin_at` (timestamp with time zone, nullable) -- horario real do check-in
- `checkout_at` (timestamp with time zone, nullable) -- horario real do checkout
- `data` (date) -- dia operacional do registro
- `observacao_checkout` (text, nullable) -- observacao opcional no checkout

### Comportamento do checkout ausente

Quando o motorista nao faz checkout, `checkout_at` e `NULL` no banco. Nao ha string vazia, nao ha valor padrao. E simplesmente nulo.

### Logica de preenchimento automatico no codigo

**Nao existe nenhuma logica que preenche checkout com valor estimado.** Confirmado por busca no codigo-fonte. O unico ponto que merece atencao e a funcao `getViagensTurno` no `MotoristaAuditoriaCard.tsx` (linha 117-119) que usa `Date.now()` como limite superior para filtrar viagens quando checkout e nulo -- isso e apenas para filtro de viagens, nao altera dados nem exibe hora falsa.

### Diferenca entre checkout do motorista vs supervisor

O checkout pelo motorista vem da funcao `realizarCheckout` no hook `useMotoristaPresenca.ts`. O checkout pelo CCO/supervisor vem da funcao `handleCheckout` no hook `useEquipe.ts`. Ambos gravam diretamente em `motorista_presenca.checkout_at` com o timestamp real do momento. Nao ha campo que diferencie quem fez o checkout, mas quando o checkout e automatico (virada operacional), a `observacao_checkout` contem "Checkout automatico (virada operacional)".

### Registros sem checkout na base atual

**29 registros sem checkout hoje (22/02)** -- esperado, pois sao motoristas em expediente ativo.

**1 registro orfao de dia anterior:**
- Leony Pereira: dia 21/02, check-in 19:27, sem checkout

---

## 2. Estrategia de Calculo das Horas

### Carga horaria de referencia: 12 horas/dia

### Horas trabalhadas por turno
- **SOMENTE calculadas** quando `checkin_at` E `checkout_at` existem como dados reais do banco
- Formula: `checkout_at - checkin_at` em minutos, convertido para horas
- Quando `checkout_at` e `null`: exibir "--" na duracao, NAO calcular, NAO somar

### Saldo por turno (quando completo)
- `saldo = horas_trabalhadas - 12h`
- Positivo = hora extra (verde)
- Negativo = debito (vermelho)
- Zero = neutro

### Total por motorista no periodo
- **Horas trabalhadas**: soma APENAS de turnos com checkout real
- **Saldo acumulado**: soma dos saldos individuais de turnos completos
- **Turnos incompletos**: contagem separada, exibida como alerta, NUNCA misturada na soma
- **Dias ausentes**: dias dentro do periodo sem nenhum registro de presenca

### O que NAO fazer nos calculos
- Nenhum calculo quando checkout for nulo
- Nenhum preenchimento automatico de checkout
- Nenhuma soma misturando completos com incompletos
- Nenhuma suposicao sobre o que deveria ter sido registrado

---

## 3. Estrategia Visual

### Card fechado (resumo do motorista)

```text
+----------------------------------------------------------+
| [A] Altair Sobrinho                    [Disponivel]       |
|     Tel: (21) 99999-9999                                  |
|                                                           |
|  +----------+  +-----------+  +-----------+  +----------+ |
|  | 120h 30m |  | +0h 30m   |  | 5 dias    |  | 1 incomp | |
|  | TOTAL    |  | SALDO     |  | COMPLETOS |  | ALERTA   | |
|  +----------+  +-----------+  +-----------+  +----------+ |
+----------------------------------------------------------+
```

- **Total horas**: numero grande e destacado -- e o dado mais importante
- **Saldo acumulado**: verde se extra, vermelho se debito, com sinal +/-
- **Dias completos**: quantos dias tem check-in E checkout
- **Alerta**: quantos dias tem registro incompleto (laranja)

### Card expandido (detalhamento dia a dia)

Cada linha representa um turno (pode haver multiplos turnos por dia):

```text
sabado, 22/02
  [!] In: 07:54   Out: --:--   Duracao: --    Saldo: --     [SEM CHECKOUT]

sexta, 21/02 - 1o Turno
  [v] In: 10:17   Out: 23:24   Duracao: 13h07  Saldo: +1h07  [COMPLETO]

sexta, 21/02 - 2o Turno
  [v] In: 15:00   Out: 03:00   Duracao: 12h00  Saldo: 0h00   [COMPLETO]
```

### Sinalizacao visual por cores

| Status | Icone | Cor | Significado |
|---|---|---|---|
| Completo, saldo positivo | CheckCircle | Verde | Hora extra |
| Completo, saldo neutro | CheckCircle | Cinza/azul | Carga cumprida |
| Completo, saldo negativo | Clock | Vermelho | Debito de hora |
| Incompleto (sem checkout) | AlertTriangle | Laranja/amber | Checkout ausente |
| Ausencia total | XCircle | Vermelho escuro | Sem nenhum registro no dia |

### Dados que NAO serao exibidos no card resumido
- Viagens e PAX (movidos para dentro do detalhe expandido)
- O foco do card e exclusivamente HORAS e SALDO

---

## 4. Alteracoes por Arquivo

### `src/hooks/useMotoristaPresencaHistorico.ts`

Alterar a interface `MotoristaPresencaAgregado` para incluir:
- `horasTrabalhadasMinutos`: soma apenas de turnos completos (checkin + checkout reais)
- `saldoMinutos`: soma dos saldos (trabalhado - 720min por turno completo)
- `turnosCompletos`: quantidade de turnos com checkout real
- `turnosIncompletos`: quantidade de turnos sem checkout
- `diasAusentes`: dias no periodo sem registro (calculado comparando datas do periodo vs datas com presenca)

Alterar o calculo em `motoristasAgregados` para:
- Contar separadamente turnos completos vs incompletos
- Calcular saldo: para cada turno completo, `duracao - 720` minutos
- NAO incluir turnos incompletos em nenhuma soma de horas

### `src/components/motoristas/MotoristaAuditoriaCard.tsx`

Redesign completo do card:

**Card fechado:**
- Remover grid de 4 colunas (Dias/Viagens/PAX/Obs)
- Substituir por: Total Horas (destaque) | Saldo Acumulado (cor) | Turnos Completos | Alertas

**Card expandido:**
- Manter agrupamento por data + turno (ja existe)
- Adicionar coluna de saldo por turno com indicador de cor
- Badge "SEM CHECKOUT" em laranja quando checkout e null
- Badge "DEBITO" em vermelho ou "EXTRA" em verde com valor
- Remover o uso de `Date.now()` como fallback na filtragem de viagens (linha 119) -- quando checkout e null, filtrar apenas por `checkin_at <= viagemTime`

### `src/components/motoristas/MotoristasAuditoria.tsx`

- Atualizar cards de totais no topo para refletir novas metricas:
  - Substituir "Total PAX" e "Observacoes" por "Horas Totais" e "Saldo Global"
  - Adicionar card "Turnos Incompletos" com cor amber como alerta
- Atualizar exportacao Excel para incluir novas colunas (horas, saldo, turnos incompletos)

### `src/components/motoristas/PresencaDiaModal.tsx`

- Adicionar secao de saldo do turno no topo, ao lado da duracao
- Cor condicional: verde (extra), vermelho (debito), cinza (neutro)
- Quando checkout e null: exibir "--:--" e texto explicito "Checkout nao registrado"

---

## 5. Ordem de Execucao

| Etapa | Descricao | Motivo da ordem |
|---|---|---|
| 1 | Alterar `useMotoristaPresencaHistorico.ts` -- adicionar campos de saldo e separacao completo/incompleto | Base de dados calculados que alimenta todos os componentes visuais |
| 2 | Redesign do `MotoristaAuditoriaCard.tsx` -- card fechado + expandido | Componente principal da auditoria, depende dos novos campos do hook |
| 3 | Atualizar `MotoristasAuditoria.tsx` -- cards de totais + exportacao | Depende do hook atualizado para exibir metricas globais corretas |
| 4 | Atualizar `PresencaDiaModal.tsx` -- saldo e sinalizacao | Complementar, depende da mesma logica |
| 5 | Limpeza do registro orfao de Leony Pereira (dia 21/02 sem checkout) | Migration SQL para fechar com checkout na virada operacional |

### Nenhuma alteracao nos dados do Supabase sera feita nos componentes -- somente leitura. A unica escrita e a migration de limpeza (etapa 5) para o registro orfao, que sera apresentada separadamente.

