

# Correcao do Fuso Horario nas Edge Functions

## Problema Identificado

As edge functions `auto-checkout` e `close-open-trips` usam `new Date(serverTimeStr).getHours()` para comparar com o horario de virada. Como o Deno roda em **UTC**, `getHours()` retorna horas UTC, nao Sao Paulo. 

Exemplo real: Se sao 04:30 em SP (virada configurada), a funcao ve 07:30 (UTC) e nao reconhece a janela de virada. O checkout acaba ocorrendo 3 horas antes ou depois do esperado.

O mesmo problema afeta `toISOString().slice(0, 10)` que retorna a data UTC em vez da data de SP.

## Solucao

Extrair horas, minutos e data diretamente da string retornada por `get_server_time()`, que ja vem no formato `YYYY-MM-DDTHH:MM:SS.MS-03:00` (horario de SP). Nunca usar `getHours()`, `getMinutes()` ou `toISOString().slice()` para obter componentes de tempo local.

### Funcao helper para ambas as edge functions

```text
function parseSPTime(serverTimeStr: string) {
  // serverTimeStr = "2026-02-16T04:30:00.000-03:00"
  // Extrair componentes diretamente da string (ja em SP)
  const datePart = serverTimeStr.substring(0, 10);    // "2026-02-16"
  const hours = parseInt(serverTimeStr.substring(11, 13), 10);  // 4
  const minutes = parseInt(serverTimeStr.substring(14, 16), 10); // 30
  return { datePart, hours, minutes, totalMinutos: hours * 60 + minutes };
}
```

Tambem para calcular "ontem" em SP, subtrair 1 dia da data extraida da string, em vez de usar `setDate()` + `toISOString()`.

---

## Arquivos Alterados

### 1. `supabase/functions/auto-checkout/index.ts`

**Linhas 21-24:** Substituir `getHours()`/`getMinutes()` por parse direto da string:
- Antes: `serverTime.getHours()` (retorna UTC)
- Depois: `parseInt(serverTimeStr.substring(11, 13), 10)` (retorna SP)

**Linhas 59-61:** Substituir `yesterday.toISOString().slice(0, 10)` por calculo de data baseado na string SP:
- Usar a data extraida da string e subtrair 1 dia manualmente

**Linhas 67-70:** Os timestamps `inicioOpDay`/`fimOpDay` ja usam `-03:00`, estao corretos -- so o calculo de `dataOntem` e `nextDayStr` precisa usar a data SP.

### 2. `supabase/functions/close-open-trips/index.ts`

**Linhas 50-52:** Mesma correcao -- substituir `serverTime.getHours()` por parse da string.

**Linhas 57-62:** Substituir `toISOString().slice(0, 10)` por data extraida da string SP.

---

## Detalhes Tecnicos

### Helper compartilhado (inline em cada funcao)

```text
function parseSPComponents(spTimeStr: string) {
  // "2026-02-16T04:30:00.000-03:00" -> componentes locais SP
  const year = parseInt(spTimeStr.substring(0, 4), 10);
  const month = parseInt(spTimeStr.substring(5, 7), 10);
  const day = parseInt(spTimeStr.substring(8, 10), 10);
  const hours = parseInt(spTimeStr.substring(11, 13), 10);
  const minutes = parseInt(spTimeStr.substring(14, 16), 10);
  const totalMinutos = hours * 60 + minutes;

  // Data como string YYYY-MM-DD
  const datePart = spTimeStr.substring(0, 10);

  // Calcular "ontem" usando Date local mas formatando manualmente
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  const yesterdayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Calcular "amanha"
  const d2 = new Date(year, month - 1, day);
  d2.setDate(d2.getDate() + 1);
  const tomorrowStr = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}-${String(d2.getDate()).padStart(2,'0')}`;

  return { datePart, yesterdayStr, tomorrowStr, hours, minutes, totalMinutos };
}
```

### Mudancas especificas no auto-checkout

```text
// ANTES (linhas 21-24):
const serverTime = new Date(serverTimeStr);
const horaAtual = serverTime.getHours();     // UTC!
const minAtual = serverTime.getMinutes();     // UTC!
const atualMinutos = horaAtual * 60 + minAtual;

// DEPOIS:
const serverTime = new Date(serverTimeStr);
const sp = parseSPComponents(serverTimeStr);
const atualMinutos = sp.totalMinutos;

// ANTES (linha 61):
const dataOntem = yesterday.toISOString().slice(0, 10);  // UTC!

// DEPOIS:
const dataOntem = sp.yesterdayStr;  // SP date - 1 day

// ANTES (linha 69):
const nextDayStr = nextDay.toISOString().slice(0, 10);  // UTC!

// DEPOIS:
const nextDayStr = sp.datePart;  // dia seguinte ao ontem = hoje SP
```

### Mudancas especificas no close-open-trips

```text
// ANTES (linhas 50-52):
const horaAtual = serverTime.getHours()    // UTC!
const minAtual = serverTime.getMinutes()   // UTC!

// DEPOIS:
const sp = parseSPComponents(serverTimeData)
const atualMinutos = sp.totalMinutos

// ANTES (linhas 59, 61):
dataOpAtual = ontem.toISOString().slice(0, 10)   // UTC!
dataOpAtual = serverTime.toISOString().slice(0, 10)  // UTC!

// DEPOIS:
dataOpAtual = sp.yesterdayStr
dataOpAtual = sp.datePart
```

### Sem migracoes de banco

Nenhuma alteracao de schema. A RPC `get_server_time()` ja retorna o formato correto com `-03:00`. O problema era exclusivamente no parse JavaScript dentro das edge functions.

