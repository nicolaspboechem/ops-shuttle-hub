

# Mostrar Veiculo Vinculado no Card de Escala

## Problema

O codigo do card ja tem a logica para mostrar o veiculo (`motorista.veiculo`), porem o hook `useMotoristas` busca apenas `select('*')` da tabela `motoristas`, sem fazer JOIN com a tabela `veiculos`. Por isso `motorista.veiculo` e sempre `undefined`.

## Solucao

Alterar a query do `useMotoristas` em `src/hooks/useCadastros.ts` para incluir o JOIN com veiculos via `veiculo_id`:

```text
.select('*, veiculo:veiculos!motoristas_veiculo_id_fkey(*)')
```

Isso popula automaticamente `motorista.veiculo` com os dados do veiculo vinculado (nome, placa, etc.), fazendo o card de escala exibir corretamente o apelido do carro.

## Arquivo alterado

| Arquivo | Acao |
|---------|------|
| `src/hooks/useCadastros.ts` | Alterar `.select('*')` para `.select('*, veiculo:veiculos!motoristas_veiculo_id_fkey(*)')` na query de motoristas (linha 107) |

Nenhuma alteracao necessaria no componente `MotoristasEscala.tsx` -- o codigo de exibicao ja existe e funcionara assim que os dados estiverem disponiveis.

