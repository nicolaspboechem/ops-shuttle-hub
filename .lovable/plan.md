
# Colunas fixas "Outros" e "Retornando pra Base" no Mapa de Servico

## Resumo

Adicionar duas colunas fixas no lado direito do Kanban do Mapa de Servico:

1. **Retornando pra Base** - motoristas que receberam missao de retorno via "Chamar para Base". Quando o motorista aceita e inicia, ele aparece nessa coluna fixa ate chegar na base.
2. **Outros** - ponto de embarque "Outros" fixado a direita, separado das colunas dinamicas da esquerda.

O layout fica: colunas de pontos dinamicos (scrollavel) a esquerda | colunas fixas "Retornando pra Base" e "Outros" a direita.

## Mudancas no layout do Kanban (MapaServico.tsx)

Dividir a area do Kanban em duas zonas:

```text
+-------------------------------------------+---------------------------+
| COLUNAS DINAMICAS (scroll horizontal)     | COLUNAS FIXAS (sticky)    |
| [GIG] [Jockey] [Hotel] [Em Transito] ... | [Retornando] [Outros]     |
+-------------------------------------------+---------------------------+
```

- As colunas fixas ficam sempre visiveis no lado direito, com `shrink-0` e sem participar do scroll horizontal
- A coluna "Retornando pra Base" mostra motoristas com missao ativa de titulo "Retorno a Base" (ou cujo `ponto_desembarque` seja o nome da base e a missao esteja pendente/aceita/em_andamento)
- A coluna "Outros" mostra motoristas cuja `ultima_localizacao` seja o ponto de embarque marcado como "Outros" no sistema

## Logica de agrupamento (useLocalizadorMotoristas.ts)

Adicionar um novo grupo especial `retornando_base` no `motoristasPorLocalizacao`:
- Motoristas com missao ativa de retorno a base (titulo contendo "Retorno" e destino = base) ficam nessa coluna, independente do status de viagem
- Precisamos receber as missoes ativas como parametro adicional ou busca-las no hook

Abordagem escolhida: a logica de separacao fica no `MapaServico.tsx` (que ja tem `missoesPorMotorista`), nao no hook, para nao alterar o comportamento do Localizador existente.

## Fluxo "Chamar para Base" atualizado

```text
1. Admin clica "Base" no card do motorista
2. Modal confirma -> cria missao "Retorno a Base"
3. Card do motorista se move automaticamente para coluna "Retornando pra Base"
4. Motorista recebe notificacao no app
5. Motorista aceita e inicia -> permanece na coluna "Retornando pra Base"
6. Ao concluir missao -> motorista volta para coluna da Base
```

## Arquivos modificados

### 1. Editar `src/pages/MapaServico.tsx`

- Na construcao de `columns`, separar em `dynamicColumns` (pontos normais + em_transito + sem_local) e `fixedColumns` (retornando_base, outros)
- Criar logica para identificar motoristas "retornando para base" baseado nas missoes ativas: motoristas com missao cujo `ponto_desembarque` == `baseNome` e status in (pendente, aceita, em_andamento)
- Retirar esses motoristas das colunas dinamicas e coloca-los na coluna fixa "Retornando pra Base"
- Mesma logica para "Outros": motoristas com `ultima_localizacao` == nome do ponto "Outros" vao para a coluna fixa em vez da dinamica
- No JSX, renderizar as colunas dinamicas dentro de um `div` com `overflow-x-auto flex-1`, e as fixas em um `div` com `shrink-0` ao lado
- Buscar o nome do ponto "Outros" (ponto de embarque com nome contendo "Outros") para saber qual localizacao filtrar

### 2. Editar `src/components/mapa-servico/MapaServicoColumn.tsx`

- Adicionar prop `isFixed` para estilizacao diferenciada (borda mais destacada, background mais escuro como no screenshot)
- Colunas fixas podem ter icone no header (Home para Base, MapPin para Outros)

### 3. Editar `src/components/mapa-servico/MapaServicoCard.tsx`

- Nenhuma mudanca necessaria nos cards -- eles ja mostram missao e status

## Detalhes tecnicos

### Identificacao de motoristas "retornando para base"

No `MapaServico.tsx`, antes de renderizar colunas:

```text
1. Iterar missoesPorMotorista
2. Para cada missao ativa com ponto_desembarque == baseNome:
   - Marcar motorista_id como "retornando"
3. No agrupamento, motoristas "retornando" saem da coluna dinamica e vao para coluna fixa "retornando_base"
```

### Identificacao do ponto "Outros"

Buscar na tabela `pontos_embarque` um ponto cujo nome contenha "Outros" para o evento. Salvar o nome exato em state para usar como filtro de localizacao. Motoristas com `ultima_localizacao` igual a esse nome vao para a coluna fixa.

### Layout CSS

```text
<div class="flex flex-1 min-h-0">
  <!-- Colunas dinamicas: scroll horizontal -->
  <div class="flex gap-3 overflow-x-auto flex-1 p-4">
    {dynamicColumns.map(...)}
  </div>
  
  <!-- Separador visual -->
  <div class="w-px bg-border shrink-0" />
  
  <!-- Colunas fixas: sempre visiveis -->
  <div class="flex gap-3 p-4 shrink-0">
    <MapaServicoColumn ... isFixed />  <!-- Retornando pra Base -->
    <MapaServicoColumn ... isFixed />  <!-- Outros -->
  </div>
</div>
```

### Drag-and-drop para colunas fixas

- Arrastar para "Retornando pra Base" nao sera permitido manualmente (precisa ser via missao "Chamar para Base")
- Arrastar para "Outros" atualiza `ultima_localizacao` para o nome do ponto "Outros"
