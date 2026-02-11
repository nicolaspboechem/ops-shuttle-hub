

# Redesign do Card do Localizador de Frota

## Problema
Os cards do localizador estao cortando o texto do trajeto (origem/destino) e a hierarquia de informacoes nao esta clara. Badges estao grandes demais.

## Nova hierarquia (de cima para baixo)

```text
+----------------------------------+
| [dot] Status label               |
| Motorista (nome, bold, grande)   |
| [car] Apelido Veiculo  PLACA    |
| Origem -> Destino (se transito)  |
+----------------------------------+
```

## Alteracoes

### Arquivo: `src/components/localizador/LocalizadorCard.tsx`

Reestruturar o card com layout vertical limpo:

1. **Linha 1 - Status**: Pequeno dot colorido + label em texto menor (sem badge arredondado grande, apenas texto com dot inline)
2. **Linha 2 - Motorista**: Nome em bold, tamanho `text-base`, sem avatar/icone circular (mais clean)
3. **Linha 3 - Veiculo**: Icone carro + apelido em `text-sm font-medium` + placa em `text-xs text-muted-foreground` na mesma linha
4. **Linha 4 - Trajeto** (somente em transito): Origem completa + seta + Destino completo, sem truncamento agressivo (`max-w-[50px]` sera removido). Usar `text-wrap` e remover `truncate` para garantir texto visivel. Usar `text-xs` para caber sem cortar.

Reducoes de tamanho:
- Remover o circulo avatar do motorista (apenas texto)
- Status badge: de `px-2.5 py-1 rounded-full text-sm` para `text-xs` simples com dot
- Padding do card: de `p-4` para `p-3`
- Remover `mb-3` entre secoes, usar `gap-1.5` com flex-col

### Arquivo: `src/components/localizador/LocalizadorColumn.tsx`

Ajustar largura minima da coluna de `min-w-[280px]` para `min-w-[260px]` e `max-w-[300px]` para cards mais compactos. Reduzir spacing entre cards de `space-y-3` para `space-y-2`.

