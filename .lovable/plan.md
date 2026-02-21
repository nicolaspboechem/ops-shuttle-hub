

# Limpar registro duplicado "Alan Nascimento"

## Situacao

Existem dois registros para o mesmo motorista (telefone 21993683642):
- **Alan da Silva Santos Nascimento** (`0fcd77e2`) -- registro correto, com veiculo, status disponivel
- **Alan Nascimento** (`d01d12d6`) -- duplicado, sem veiculo, com missao e viagem orfas travadas

## Dados vinculados ao registro duplicado

| Recurso | ID | Status |
|---|---|---|
| Missao orfa | `e19f112e` | em_andamento |
| Viagem orfa | `0e4f9610` | em_andamento |
| Credencial | `112f60ae` | ativa |
| Presenca | nenhuma | - |

## Acoes a executar (todas via SQL direto no banco)

1. **Encerrar missao orfa** -- atualizar status para `cancelada`
2. **Encerrar viagem orfa** -- atualizar status para `encerrado`, `encerrado = true`, `h_fim_real = now()`
3. **Desativar credencial** -- `ativo = false` na credencial `112f60ae`
4. **Desativar motorista duplicado** -- `ativo = false` no motorista `d01d12d6`

Nao sera feita exclusao fisica (DELETE) para preservar integridade referencial. Ao marcar `ativo = false`, o motorista desaparece de todas as listas e filtros da aplicacao.

## Resultado esperado

- O "Alan Nascimento" some da lista de motoristas
- Apenas o "Alan da Silva Santos Nascimento" permanece visivel
- Nenhuma missao ou viagem fica travada
- A missao "Levar VIP GIG" de hoje fica liberada para aceite no app do motorista

