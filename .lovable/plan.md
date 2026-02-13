

# Otimizacao Fase 2 - Operador e Supervisor tambem sobrecarregam o Supabase

## Diagnostico

A v1.7.4 otimizou apenas o **app do motorista**. Mas os apps do **Operador** e **Supervisor** continuam com os mesmos problemas que causavam a sobrecarga:

### Problemas que persistem

| App | Hook | Problema |
|---|---|---|
| AppMotorista | `useEventos()` | Realtime **sem filtro** na tabela `eventos` - desnecessario no app do motorista |
| AppOperador | `useMissoes(eventoId)` | Realtime **sem filtro** na tabela `missoes` - cada missao criada dispara refetch |
| AppOperador | `useMotoristas(eventoId)` x2 | Carrega motoristas **duas vezes** (linhas 88 e 91) |
| AppSupervisor | `useMissoes(eventoId)` | Realtime **sem filtro** na tabela `missoes` |
| AppSupervisor | `useLocalizadorMotoristas` | **3 subscricoes Realtime** no mesmo canal (motoristas + viagens + presenca), cada uma dispara `fetchMotoristas()` que faz **4 queries sequenciais** |
| Todos | `useViagens` | Canal Realtime generico `viagens-changes` sem filtro de `evento_id` |

### Calculo do impacto atual

Com ~10 operadores/supervisores + 41 motoristas conectados:
- Cada missao criada dispara refetch em **todos** os operadores/supervisores (useMissoes sem filtro)
- `useLocalizadorMotoristas` faz 4 queries a cada evento Realtime (motoristas, presenca, veiculos, viagens)
- `useViagens` no Operador/Supervisor escuta TODAS as viagens de todos os eventos
- Total estimado: **200-400 queries/minuto** desnecessarias

## Solucao

### 1. useViagens.ts - Adicionar filtro `evento_id` no Realtime

O canal `viagens-changes` escuta TODAS as viagens de todos os eventos. Adicionar filtro:

```text
filter: `evento_id=eq.${eventoId}`
```

### 2. useMissoes.ts - Adicionar filtro `evento_id` no Realtime do hook global

O hook `useMissoes` (usado por Operador/Supervisor) escuta todas as missoes sem filtro. Adicionar:

```text
filter: `evento_id=eq.${eventoId}`
```

### 3. AppMotorista.tsx - Remover useEventos desnecessario

O motorista usa `useEventos()` apenas para encontrar o nome do evento. Isso cria uma subscricao Realtime na tabela `eventos` que e totalmente desnecessaria. Substituir por uma query direta pontual.

### 4. AppOperador.tsx - Remover duplicacao de useMotoristas

Linhas 88 e 91 carregam motoristas duas vezes com o mesmo eventoId. Remover a duplicacao.

### 5. useLocalizadorMotoristas.ts - Debounce nos eventos Realtime

O hook escuta 3 tabelas e cada evento dispara `fetchMotoristas()` que faz 4 queries. Adicionar um debounce de 2 segundos para agrupar eventos rapidos em uma unica query.

### 6. useAlertasFrota.ts - Sem Realtime (OK, mas sem polling)

Este hook nao tem Realtime nem polling - alertas so atualizam no mount. Nao e critico mas vale notar.

### 7. Versao

Atualizar `APP_VERSION` para `1.7.5`.

## Resumo de mudancas

| Arquivo | Mudanca | Impacto |
|---|---|---|
| `src/hooks/useViagens.ts` | Filtrar canal Realtime por `evento_id` | -80% eventos Realtime processados |
| `src/hooks/useMissoes.ts` | Filtrar canal Realtime por `evento_id` no hook global | -80% eventos Realtime processados |
| `src/pages/app/AppMotorista.tsx` | Remover `useEventos()`, buscar evento diretamente | -1 subscricao Realtime por motorista |
| `src/pages/app/AppOperador.tsx` | Remover `useMotoristas` duplicado | -50% queries de motoristas |
| `src/hooks/useLocalizadorMotoristas.ts` | Adicionar debounce de 2s nos callbacks Realtime | -70% queries em rajada |
| `src/lib/version.ts` | Atualizar para 1.7.5 | - |

## Resultado esperado

- Reducao de ~70% nas queries desnecessarias do Operador/Supervisor
- Realtime filtrado por evento evita cross-talk entre eventos diferentes
- App mais responsivo em 4G porque cada update Realtime gera menos queries cascata
- Combinado com v1.7.4, reducao total estimada de ~90% na carga do Supabase

