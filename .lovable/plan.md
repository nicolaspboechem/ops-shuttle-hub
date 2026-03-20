

## Remover campo PAX retorno do modal de Shuttle Rápido

### Mudança

**Arquivo: `src/components/app/ShuttleEncerrarModal.tsx`**

1. Remover o bloco de input "Passageiros de volta" (linhas 78-94) — o campo PAX retorno, label e texto auxiliar
2. Remover o estado `paxRetorno` (linha 25) e sua referência no `resetForm` (linha 30)
3. Na chamada de update (linha 44), setar `qtd_pax_retorno: 0` fixo em vez de usar a variável

O modal ficará apenas com o campo de observação e o botão de confirmar.

