

# Corrigir marcas no banco de dados e melhorar filtros de Motoristas

## 1. Correcoes no banco de dados (marcas de veiculos)

Foram encontradas 3 marcas escritas incorretamente:

| Placa | Marca atual | Marca corrigida |
|-------|------------|-----------------|
| TYC6A93 | Hyunday | Hyundai |
| QSN0I63 | KIA | Kia |
| TEP8A76 | Wolkswagen | Volkswagen |

Executar as seguintes correcoes via UPDATE:

```text
UPDATE veiculos SET marca = 'Hyundai' WHERE id = '7f7c8b13-b41d-4688-8eb7-247c9977d6cd';
UPDATE veiculos SET marca = 'Kia' WHERE id = 'd7e169fe-592a-4d7f-8534-b7b9ed53c671';
UPDATE veiculos SET marca = 'Volkswagen' WHERE id = '3aa9646a-00ad-4f8b-9b05-310286c99a6f';
```

## 2. Melhorias nos filtros de Motoristas

### Filtros atuais
- Busca por nome/telefone
- Tipo de veiculo (Onibus, Van, etc.)
- Status (disponivel, em_viagem, indisponivel, inativo)

### Filtros a adicionar

**a) Filtro "Vinculo de Veiculo"** - com 3 opcoes:
- Todos
- Com veiculo vinculado
- Sem veiculo vinculado

Isso ajuda a encontrar rapidamente motoristas que ainda precisam ser associados a um veiculo.

**b) Filtro "Ativo/Inativo"** - com 3 opcoes:
- Todos
- Ativos
- Inativos

Permite filtrar motoristas desativados que nao aparecem na operacao.

### Tecnico

**Arquivo**: `src/pages/Motoristas.tsx`

1. Adicionar dois novos estados:
   - `filterVinculo` ('all' | 'com_veiculo' | 'sem_veiculo')
   - `filterAtivo` ('all' | 'ativo' | 'inativo')

2. Na funcao `filteredCadastrados` (useMemo, ~linha 329), adicionar as condicoes:
   - `filterVinculo === 'com_veiculo'` → filtra motoristas com `veiculo_id !== null`
   - `filterVinculo === 'sem_veiculo'` → filtra motoristas com `veiculo_id === null`
   - `filterAtivo === 'ativo'` → filtra `m.ativo === true`
   - `filterAtivo === 'inativo'` → filtra `m.ativo === false`

3. Na barra de filtros (UI), adicionar dois novos `<Select>` ao lado dos existentes

4. Atualizar `clearFilters` e `hasActiveFilters` para incluir os novos filtros

