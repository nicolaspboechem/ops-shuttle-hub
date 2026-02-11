

# Adicionar colunas fixas "Retornando pra Base" e "Outros" no Painel Localizador

## Problema

As colunas fixas foram implementadas apenas no Mapa de Servico. O Painel Localizador (`/localizador/:eventoId`) continua com o layout antigo, sem separacao entre colunas dinamicas e fixas.

## Solucao

Replicar a mesma logica de separacao do `MapaServico.tsx` no `PainelLocalizador.tsx`:

- Buscar o nome do ponto "Base" e o ponto "Outros" na tabela `pontos_embarque`
- Buscar missoes ativas para identificar motoristas "retornando para base"
- Separar motoristas em 3 grupos: dinamicos (scroll), retornando pra base (fixo), outros (fixo)
- Dividir o layout em zona scrollavel a esquerda e zona fixa a direita

## Arquivos modificados

### 1. `src/pages/PainelLocalizador.tsx`

- Importar `useMissoes` para obter missoes ativas
- Adicionar state para `baseNome` e `outrosNome` (buscar de `pontos_embarque`)
- Calcular `missoesPorMotorista`, `retornandoBaseIds` (mesma logica do MapaServico)
- Separar `motoristasPorLocalizacao` em `dynamicMotoristas`, `retornandoBaseMotoristas`, `outrosMotoristas`
- Filtrar `localizacoes` para excluir o ponto "Outros" das dinamicas
- Alterar o JSX do Kanban Grid:
  - Zona esquerda (scrollavel): colunas de localizacao + em_transito + sem_local
  - Separador vertical
  - Zona direita (fixa, `shrink-0`): coluna "Retornando pra Base" + coluna "Outros"
- Atualizar stats para incluir contagem de retornando

### 2. `src/components/localizador/LocalizadorColumn.tsx`

- Adicionar prop `isFixed?: boolean` para estilizacao diferenciada (borda tracejada, fundo destacado)
- Adicionar novos tipos: `'retornando_base' | 'outros'` ao tipo `tipo`
- Configurar icones e cores para os novos tipos (Home para retornando, MapPinOff para outros)

### Layout resultante

```text
+---------------------------------------------+-----------------------------+
| COLUNAS DINAMICAS (scroll horizontal)       | COLUNAS FIXAS (sticky)      |
| [GIG] [Hotel] [Em Transito] [Sem Local] .. | [Retornando Base] [Outros]  |
+---------------------------------------------+-----------------------------+
```

### Detalhes tecnicos

A logica de identificacao de motoristas "retornando" eh identica ao MapaServico:

1. Buscar missoes ativas com `ponto_desembarque == baseNome`
2. Motoristas com essas missoes vao para coluna fixa "Retornando pra Base"
3. Motoristas com `ultima_localizacao == outrosNome` vao para coluna fixa "Outros"
4. Os demais permanecem nas colunas dinamicas

Nenhuma alteracao de banco de dados necessaria.

