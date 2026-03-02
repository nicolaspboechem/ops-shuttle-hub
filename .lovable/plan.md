

# Edicao de PAX no CCO Desktop + Observacao Unificada no Mobile

## Parte 1: Edicao de PAX Ida (apenas CCO Desktop)

### 1.1 Backend - Incluir `qtd_pax` no update

**Arquivo:** `src/hooks/useViagens.ts` (linha ~108)

Adicionar `qtd_pax: updated.qtd_pax` ao objeto de update na funcao `updateViagem`.

### 1.2 EditViagemModal (Desktop)

**Arquivo:** `src/components/viagens/EditViagemModal.tsx`

- Adicionar `qtd_pax` ao estado `form` (linha 29-34)
- Mover "PAX Ida" da secao de info fixa (linhas 108-114) para a secao editavel, como Input numerico similar ao "PAX Retorno"
- Adicionar `qtd_pax: form.qtd_pax` ao objeto `updated` no `handleSave` (linha 48-55)
- Adicionar campo de Observacao (Textarea) ao modal, tambem editavel, para permitir correcoes pelo CCO

---

## Parte 2: Observacao Unificada (apenas Mobile)

### 2.1 Criar componente `ObservacaoUnificada.tsx`

**Novo arquivo:** `src/components/viagens/ObservacaoUnificada.tsx`

Componente compacto com:
- Props: `observacaoInicial: string | null`, `onSave: (obs: string) => void`
- Estado interno: `texto`, `editando`
- Modo leitura: exibe texto (ou "Nenhuma observacao") com botao Editar (icone Pencil)
- Modo edicao: Textarea + botao Salvar
- Ao salvar, chama `onSave` e volta ao modo leitura

### 2.2 Integrar no ViagemCardOperador (viagens ativas mobile)

**Arquivo:** `src/components/app/ViagemCardOperador.tsx`

- Substituir a exibicao estatica da observacao (linhas 326-330) pelo componente `ObservacaoUnificada`
- O `onSave` fara update direto via `supabase.from('viagens').update({ observacao }).eq('id', viagem.id)` e chamara `onUpdate()`
- Isso permite editar a observacao em qualquer etapa da viagem (ativa ou standby)

---

## Arquivos afetados

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `src/hooks/useViagens.ts` | Editar | Adicionar `qtd_pax` ao `updateViagem` |
| `src/components/viagens/EditViagemModal.tsx` | Editar | PAX Ida editavel + campo Observacao |
| `src/components/viagens/ObservacaoUnificada.tsx` | Novo | Componente reutilizavel para observacao |
| `src/components/app/ViagemCardOperador.tsx` | Editar | Integrar ObservacaoUnificada |

