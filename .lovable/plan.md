

# Categoria de Missao "Deslocamento"

## Resumo

Adicionar uma terceira opcao no modal de tipo de missao chamada **Deslocamento**, que cria missoes com titulo auto-gerado no formato `"Deslocamento: Ponto A -> Ponto B"`. O motorista ve no app com a mesma interface, mas com identificacao visual de deslocamento.

---

## 1. Atualizar MissaoTipoModal com terceira opcao

**Arquivo:** `src/components/motoristas/MissaoTipoModal.tsx`

- Adicionar `'deslocamento'` ao type `MissaoTipo`
- Adicionar terceiro botao com icone `Route` (lucide) e cor verde/teal:

```text
[Zap] Missao Instantanea
      Rapida: motorista, A -> B

[Calendar] Missao Agendada
           Completa: data, horario, pax...

[Route] Deslocamento               <-- NOVO
        Motorista se desloca A -> B
```

## 2. Criar modal MissaoDeslocamentoModal

**Arquivo:** `src/components/motoristas/MissaoDeslocamentoModal.tsx` (NOVO)

Modal simplificado, similar ao `MissaoInstantaneaModal`, mas:
- **Sem campo de titulo** - o titulo e gerado automaticamente como `"Deslocamento: {Origem} -> {Destino}"`
- Campos: Motorista (combobox), Origem (select), Destino (select)
- Ao submeter, chama `onSave` com o titulo auto-gerado e `prioridade: 'normal'`, `qtd_pax: 0`

## 3. Integrar no MissoesPanel

**Arquivo:** `src/components/motoristas/MissoesPanel.tsx`

- Importar novo modal e atualizar o handler do `MissaoTipoModal`:

```text
onSelect -> 
  'instantanea' -> abre MissaoInstantaneaModal
  'agendada' -> abre MissaoModal (formulario completo)
  'deslocamento' -> abre MissaoDeslocamentoModal   <-- NOVO
```

## 4. Identificacao visual no app do motorista

**Arquivo:** `src/components/app/MissaoCardMobile.tsx`

Atualizar a funcao `getMissaoTipo` para detectar deslocamentos:
- Se `missao.titulo` comeca com `"Deslocamento:"`, retornar tipo `'deslocamento'` com icone `Route` e cor verde/teal
- Prioridade sobre as outras categorias (verificar antes de instantanea/agendada)

## 5. Adicionar atalho no NewActionModal (apps mobile)

**Arquivo:** `src/components/app/NewActionModal.tsx`

Adicionar `'deslocamento'` ao `ActionType` e um quarto botao no modal:

```text
[Target] Missao
[Route] Deslocamento          <-- NOVO
[ArrowRightLeft] Transfer
[Bus] Shuttle
```

**Arquivo:** `src/pages/app/AppSupervisor.tsx` (e similares)

No handler do `NewActionModal`, quando `tipo === 'deslocamento'`, abrir o `MissaoDeslocamentoModal`.

---

## Detalhes Tecnicos

### Arquivos alterados

| Arquivo | Acao |
|---------|------|
| `src/components/motoristas/MissaoTipoModal.tsx` | Adicionar opcao 'deslocamento' |
| `src/components/motoristas/MissaoDeslocamentoModal.tsx` | **NOVO** - Modal simplificado sem campo titulo |
| `src/components/motoristas/MissoesPanel.tsx` | Integrar novo modal no fluxo |
| `src/components/app/MissaoCardMobile.tsx` | Detectar e exibir categoria deslocamento |
| `src/components/app/NewActionModal.tsx` | Adicionar botao Deslocamento |
| `src/pages/app/AppSupervisor.tsx` | Handler para abrir modal deslocamento |

### Sem migracoes de banco

O deslocamento e apenas uma convencao de titulo (`"Deslocamento: X -> Y"`). Nao precisa de campo novo na tabela `missoes` - a deteccao e feita pelo prefixo do titulo.

### Formato do titulo gerado

```text
Deslocamento: {nome_ponto_origem} → {nome_ponto_destino}
```

O caractere de seta e `→` (unicode) para ficar consistente com o resto do sistema.

