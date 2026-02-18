
# Corrigir Viagens Presas e Migrar Checagens de `encerrado` para `status`

## Problema Diagnosticado

### Caso do Cassio
- Missao `5e208826` com `status=aceita` mas viagem `8dc04fff` com `status=em_andamento`
- Motorista com `status=em_viagem` -- preso, nao consegue aceitar/iniciar/finalizar missoes
- Provavelmente uma falha de rede durante o inicio da missao deixou a missao em `aceita` em vez de `em_andamento`

### Outros motoristas afetados
- **Leonardo Nunes Costa**: missao `concluida` mas viagem `em_andamento` (sync falhou)
- **Elaine da Silva Cunha Lagreca**: viagem com `encerrado=true` mas `status=em_andamento` (inconsistencia)
- **Felipe Quirino**: viagem `em_andamento` sem missao vinculada

### Causa raiz no codigo
Em **2 locais**, o sistema checa viagens ativas usando o campo legado `encerrado = false` em vez do campo `status`. Isso causa:
1. Viagens que foram encerradas por `status` mas nao por `encerrado` (ou vice-versa) ficam "fantasmas"
2. O motorista nao volta para `disponivel` porque a checagem encontra viagens "falsamente abertas"

## Correcoes

### 1. Corrigir dados no banco (imediato)
Executar SQL para:
- Encerrar viagem do Cassio e da missao vinculada
- Encerrar viagens orfas dos outros motoristas afetados (Leonardo, Elaine)
- Atualizar motoristas para `disponivel`
- Sincronizar campo `encerrado` com `status` para todas as viagens inconsistentes

### 2. `src/pages/app/AppMotorista.tsx` (linhas 378-384)
Trocar a checagem de viagens ativas apos finalizar missao:
- **De**: `.eq('encerrado', false)`
- **Para**: `.in('status', ['agendado', 'em_andamento', 'aguardando_retorno'])`

### 3. `src/hooks/useMissoes.ts` (linhas 440-446)
Trocar a checagem no `syncMotoristaAoEncerrarMissao`:
- **De**: `.eq('encerrado', false)`
- **Para**: `.in('status', ['agendado', 'em_andamento', 'aguardando_retorno'])`

### 4. Resiliencia adicional no `AppMotorista.tsx` (acao `iniciar`)
Adicionar um `refetch()` apos as atualizacoes no banco para garantir que o estado local reflita a realidade, mesmo com falhas parciais de Realtime.

## Arquivos alterados: 2

1. `src/pages/app/AppMotorista.tsx` -- corrigir filtro legado
2. `src/hooks/useMissoes.ts` -- corrigir filtro legado

## SQL de correcao de dados (executar via migracao)

Sincronizar todas as viagens com inconsistencia `encerrado` vs `status`:
- Viagens com `status = 'encerrado'` devem ter `encerrado = true`
- Viagens com `encerrado = true` e `status != 'encerrado'` devem ter `status = 'encerrado'`
- Missoes com viagem encerrada devem ter status `concluida`
- Motoristas sem viagens realmente ativas devem voltar para `disponivel`
