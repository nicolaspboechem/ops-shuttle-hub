

# Horarios de Inicio/Termino do Evento + Finalizacao Diaria

## Resumo

Adicionar campos de horario ao periodo do evento (data+hora de inicio e data+hora de termino) e garantir que a finalizacao diaria (auto-checkout) ocorra as 4:50 AM conforme configurado no campo `horario_virada_dia`.

---

## 1. Adicionar colunas de horario ao banco de dados

**Migracao SQL**: Adicionar `horario_inicio_evento` e `horario_fim_evento` na tabela `eventos`.

```sql
ALTER TABLE eventos
  ADD COLUMN horario_inicio_evento time DEFAULT '08:00:00',
  ADD COLUMN horario_fim_evento time DEFAULT '23:00:00';
```

Esses campos complementam `data_inicio` e `data_fim` ja existentes, formando datetime completos:
- Inicio do evento: `data_inicio` + `horario_inicio_evento`
- Termino do evento: `data_fim` + `horario_fim_evento`

## 2. Atualizar EditEventoModal - Aba "Periodo"

**Arquivo:** `src/components/eventos/EditEventoModal.tsx`

Na aba "Periodo", adicionar campos de horario ao lado de cada data:

```text
[Data de Inicio]  [Horario Inicio]
  14/02/2026         08:00

[Data de Termino] [Horario Termino]
  24/02/2026         23:00

--- Finalizacao Diaria ---
[Horario de Virada do Dia]
  04:50

Atividades apos meia-noite e antes deste horario
contam como o dia anterior. Todos os dados do dia
sao finalizados automaticamente neste horario.
```

Mudancas:
- Novos states `horarioInicio` e `horarioFim` (inputs type="time")
- Salvar os novos campos no `handleSave`
- Carregar valores existentes no `useEffect`
- Texto explicativo atualizado para deixar claro que a finalizacao diaria (checkout automatico, encerramento de viagens, cancelamento de missoes) ocorre no horario de virada

## 3. Atualizar CreateEventoWizard - Step 2

**Arquivo:** `src/components/eventos/CreateEventoWizard.tsx`

No step 2 (Periodo), adicionar os mesmos campos de horario:
- `horarioInicio` (default: "08:00")
- `horarioFim` (default: "23:00")
- Salvar no `handleCreate`

## 4. Exibir periodo completo no EventoCard

**Arquivo:** `src/components/eventos/EventoCard.tsx`

Mostrar o periodo do evento com data e hora (se disponivel):
```text
14/02 08:00 - 24/02 23:00
```

## 5. Atualizar tipos TypeScript

**Arquivo:** `src/lib/types/viagem.ts`

Adicionar campos opcionais a interface `Evento`:
```typescript
horario_inicio_evento?: string | null;
horario_fim_evento?: string | null;
```

---

## Sobre a Finalizacao Diaria as 4:50

O campo `horario_virada_dia` ja controla quando o `auto-checkout` executa a finalizacao. Para que ocorra as 4:50 AM, basta configurar esse campo como `04:50` no modal de edicao do evento. A edge function `auto-checkout` ja respeita esse valor por evento.

O texto explicativo na aba "Periodo" sera atualizado para deixar claro que:
- O horario de virada define quando ocorre a finalizacao automatica do dia
- Nesse momento: viagens sao encerradas, missoes canceladas, motoristas recebem checkout automatico
- Um novo dia operacional se inicia

---

## Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Adicionar `horario_inicio_evento` e `horario_fim_evento` |
| `src/components/eventos/EditEventoModal.tsx` | Campos de horario inicio/fim + texto explicativo virada |
| `src/components/eventos/CreateEventoWizard.tsx` | Campos de horario inicio/fim no step 2 |
| `src/components/eventos/EventoCard.tsx` | Exibir periodo com horario |
| `src/lib/types/viagem.ts` | Novos campos opcionais na interface Evento |

