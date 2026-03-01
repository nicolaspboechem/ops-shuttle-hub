

# Corrigir coluna "Iniciado por" para exibir nome real do usuario

## Problema

O campo `iniciado_por` esta NULL em todas as viagens do banco de dados. Porem o campo `criado_por` contem o UUID real do usuario que criou a viagem. A tabela usa `getName(viagem.iniciado_por)` que, por ser null, retorna "Sistema" via o hook `useUserNames`.

## Solucao

### 1. Usar `criado_por` como fallback na ViagensTable

**Arquivo:** `src/components/viagens/ViagensTable.tsx`

Alterar a coleta de IDs e a exibicao para usar `criado_por` quando `iniciado_por` for null:

```typescript
// Coletar IDs: preferir iniciado_por, fallback criado_por
const responsavelIds = useMemo(
  () => viagens.map(v => v.iniciado_por || v.criado_por),
  [viagens]
);
const { getName } = useUserNames(responsavelIds);
```

Na celula da tabela:
```typescript
{getName(viagem.iniciado_por || viagem.criado_por)}
```

### 2. Gravar `iniciado_por` nas funcoes operacionais (para dados futuros)

**Arquivo:** `src/hooks/useViagemOperacao.ts`

Na funcao `iniciarViagem()`, gravar o `user.id` atual no campo `iniciado_por` ao iniciar a viagem:

```typescript
iniciado_por: user.id,
```

Isso garante que novas viagens iniciadas operacionalmente terao o campo preenchido. Viagens existentes continuarao usando o fallback `criado_por`.

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/viagens/ViagensTable.tsx` | Usar `criado_por` como fallback quando `iniciado_por` for null |
| `src/hooks/useViagemOperacao.ts` | Gravar `iniciado_por` ao iniciar viagem |

