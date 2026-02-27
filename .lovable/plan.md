
# Fluxo Shuttle: marcar retorno na mesma viagem + campo de observacao

## Resumo

Ao chegar no destino, o shuttle pode marcar "Retornar a base" (invertendo origem/destino na mesma viagem, mantendo status `em_andamento`) ou encerrar direto. Um campo de observacao e adicionado para registro na auditoria. As mudancas valem automaticamente para **Operador e Supervisor**, pois ambos usam os mesmos componentes compartilhados (`ViagemCardOperador`, `ShuttleEncerrarModal`).

## Fluxo

```text
Shuttle em_andamento (ida)
    |
    "Chegou ao Destino"
    |
    Dialog:
      - PAX ida: [input numerico]
      - [x] Retornar a base (default ON para shuttle)
      - Observacao: [textarea opcional]
      - Botao: "Confirmar e Retornar" / "Encerrar Viagem"
    |
    +-- Retornar marcado --> salva PAX + obs, inverte origem/destino, mantém em_andamento
    +-- Retornar desmarcado --> encerra viagem direto (com obs)

Shuttle em_andamento (retornando)
    |
    "Chegou ao Destino"
    |
    Dialog sem checkbox "Retornar" (ja esta retornando):
      - PAX retorno: [input numerico]
      - Observacao: [textarea opcional]
      - Botao: "Encerrar Viagem"
    |
    --> Encerra viagem (salva qtd_pax_retorno + obs)
```

## Arquivos afetados

### 1. `src/hooks/useViagemOperacao.ts`
- Adicionar parametro `observacao?: string` em `registrarChegada` e `encerrarViagem`
- Nova funcao `marcarRetorno(viagem, qtdPax, observacao?)`: faz UPDATE invertendo `ponto_embarque`/`ponto_desembarque` (texto e IDs), salva `qtd_pax` da ida, salva observacao, mantém `status: 'em_andamento'`, seta `viagem_pai_id = viagem.id` para sinalizar que esta retornando

### 2. `src/hooks/useViagemOperacaoStaff.ts`
- Mesmas alteracoes: `observacao` em `registrarChegada`/`encerrarViagem`, nova funcao `marcarRetorno`

### 3. `src/components/app/ViagemCardOperador.tsx`
- Adicionar states `observacao` e `retornarBase` (default `true` para shuttle)
- Trocar checkbox "Aguardar retorno (standby)" por "Retornar a base"
- Adicionar `<Textarea>` para observacao no dialog de chegada
- Logica do `confirmChegada`:
  - Se `retornarBase` (shuttle): chamar `marcarRetorno` (inverte pontos, mantém em andamento)
  - Se nao retornar: chamar `registrarChegada` sem standby (encerra direto)
- Detectar viagem ja retornando (`viagem_pai_id === viagem.id`): esconder checkbox, so permitir encerrar
- Atualizar texto do botao: "Confirmar e Retornar" vs "Encerrar Viagem"
- Atualizar interface `ViagemOperacoes` para incluir `marcarRetorno`

### 4. `src/components/app/ShuttleEncerrarModal.tsx`
- Adicionar `<Textarea>` para observacao antes do botao "Confirmar Encerramento"
- Salvar observacao no update do Supabase

## Impacto

- **Operador e Supervisor**: ambos usam `ViagemCardOperador` e `ShuttleEncerrarModal`, entao as mudancas se aplicam automaticamente aos dois
- **Localizador**: viagem permanece `em_andamento` durante ida e volta, visivel o tempo todo
- **Auditoria**: campo `observacao` ja e lido pelas tabelas de auditoria existentes, sem mudanca adicional
