

# Corrigir query de missoes - Disambiguar FK motoristas/veiculos

## Problema

A query no `useMissoes.ts` faz:
```
motorista:motoristas(nome, veiculos(nome, placa))
```

Mas existem DUAS foreign keys entre `motoristas` e `veiculos`:
1. `veiculos.motorista_id -> motoristas.id` (one-to-many)
2. `motoristas.veiculo_id -> veiculos.id` (many-to-one)

O PostgREST nao sabe qual usar e retorna erro PGRST201. Por isso, ZERO missoes aparecem na tela.

## Solucao

Especificar o FK correto na query. Como queremos o veiculo vinculado ao motorista (via `motoristas.veiculo_id`), usamos:

```
motorista:motoristas(nome, veiculos!motoristas_veiculo_id_fkey(nome, placa))
```

## Mudanca

Um unico arquivo: `src/hooks/useMissoes.ts`, linha 84.

**Antes:**
```typescript
motorista:motoristas(nome, veiculos(nome, placa))
```

**Depois:**
```typescript
motorista:motoristas(nome, veiculos!motoristas_veiculo_id_fkey(nome, placa))
```

## Resultado

As 17 missoes cadastradas para hoje voltarao a aparecer imediatamente na aba Missoes do Mapa de Servico, com motorista, veiculo e placa exibidos nos cards.

