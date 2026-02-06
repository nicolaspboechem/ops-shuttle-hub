

# Plano: Corrigir Erro 400 (Veiculos) e Melhorar Mensagens de Erro

## Problemas a Corrigir

### 1. Erro 400 - Query de Veiculos (CRITICO)
A query em `useCadastros.ts` (linha 213-219) tenta fazer JOINs com `profiles` usando foreign keys que nao existem no banco:
- `profiles!veiculos_inspecao_por_fkey(full_name)`
- `profiles!veiculos_liberado_por_fkey(full_name)`

Isso causa erro 400 em **toda** consulta de veiculos no sistema.

### 2. Mensagens de Erro Genericas (MELHORIA)
Atualmente, os erros mostram mensagens tecnicas ou codigos HTTP ao usuario. Exemplos:
- `"Motorista criado! Mas erro no login: FunctionsHttpError"` -- pouco util
- `"Erro ao criar login: [mensagem tecnica]"` -- nao ajuda o usuario
- `"Erro ao criar veiculo"` -- sem detalhes

---

## Solucao

### Parte 1: Migracao SQL - Criar Foreign Keys

Criar as constraints faltantes para que os JOINs funcionem:

```sql
ALTER TABLE public.veiculos
  ADD CONSTRAINT veiculos_inspecao_por_fkey
  FOREIGN KEY (inspecao_por) REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

ALTER TABLE public.veiculos
  ADD CONSTRAINT veiculos_liberado_por_fkey
  FOREIGN KEY (liberado_por) REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;
```

### Parte 2: Fallback na Query de Veiculos

**Arquivo:** `src/hooks/useCadastros.ts`

Adicionar um bloco try/fallback na funcao `fetchVeiculos` para que, se a query com JOINs falhar (por qualquer motivo), o sistema tente uma query simples sem JOINs. Isso garante resiliencia caso as foreign keys nao existam ou sejam removidas.

```tsx
// Tentar com JOINs
const { data, error } = await query;

// Se falhou, tentar sem JOINs (fallback)
if (error) {
  console.warn('Query com JOINs falhou, tentando sem:', error.message);
  const fallbackQuery = supabase
    .from('veiculos')
    .select('*')
    .order('placa', { ascending: true });
  // ...continuar com fallback
}
```

### Parte 3: Mensagens de Erro Amigaveis

Substituir mensagens tecnicas por avisos claros com descricao e orientacao ao usuario.

**Arquivo:** `src/components/motoristas/CreateMotoristaWizard.tsx`

Mapear codigos de erro para mensagens amigaveis:

| Codigo/Erro | Mensagem Atual | Mensagem Nova |
|-------------|----------------|---------------|
| 409 (telefone em uso) | "Este telefone ja esta em uso por outro motorista" | "Telefone ja cadastrado - Este numero de telefone ja possui um login vinculado a outro motorista. Use um numero diferente ou edite o cadastro existente." |
| Erro HTTP generico | "Erro ao criar login: FunctionsHttpError" | "Falha na criacao do login - Nao foi possivel criar as credenciais de acesso. Verifique sua conexao e tente novamente." |
| 400 (dados invalidos) | Mensagem tecnica | "Dados invalidos - Verifique se o telefone tem 10-11 digitos e a senha tem pelo menos 4 caracteres." |
| Erro de rede | "Erro ao criar motorista" | "Erro de conexao - Nao foi possivel conectar ao servidor. Verifique sua internet e tente novamente." |

Na area de exibicao do erro (linhas 452-462), melhorar o componente de alerta para incluir titulo e descricao:

```tsx
{loginError && (
  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
    <p className="text-sm font-medium text-destructive flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {loginError.titulo}
    </p>
    <p className="text-xs text-muted-foreground pl-6">
      {loginError.descricao}
    </p>
  </div>
)}
```

**Arquivo:** `src/components/equipe/EditMotoristaLoginModal.tsx`

Aplicar o mesmo padrao de mensagens amigaveis nos handlers `handleCreateLogin` e `handleResetPassword`:
- Erro 409: "Este telefone ja possui login cadastrado para outro motorista."
- Erro generico: "Nao foi possivel criar o login. Verifique os dados e tente novamente."

**Arquivo:** `src/components/veiculos/CreateVeiculoWizard.tsx`

Melhorar as mensagens de erro na criacao de veiculos:
- Erro 23505 (placa duplicada): "Placa duplicada - Ja existe um veiculo cadastrado com a placa {PLACA}. Verifique se o veiculo ja foi cadastrado."
- Erro generico: "Erro ao cadastrar veiculo - Nao foi possivel salvar os dados. Verifique sua conexao e tente novamente."

**Arquivo:** `src/components/equipe/AddStaffWizard.tsx`

Aplicar mensagens amigaveis para erros na criacao de equipe.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar foreign keys `veiculos_inspecao_por_fkey` e `veiculos_liberado_por_fkey` |
| `src/hooks/useCadastros.ts` | Adicionar fallback na query de veiculos |
| `src/components/motoristas/CreateMotoristaWizard.tsx` | Mensagens de erro amigaveis com titulo + descricao |
| `src/components/equipe/EditMotoristaLoginModal.tsx` | Mensagens de erro amigaveis |
| `src/components/veiculos/CreateVeiculoWizard.tsx` | Mensagens de erro amigaveis |
| `src/components/equipe/AddStaffWizard.tsx` | Mensagens de erro amigaveis |

---

## Resultado Esperado

1. **Erro 400 eliminado** - Foreign keys + fallback garantem que veiculos sempre carregam
2. **Erros claros** - Usuario ve titulo do problema + orientacao para corrigir
3. **Sem codigos tecnicos** - Nenhum "409", "400", "FunctionsHttpError" aparece na interface
4. **Resiliencia** - Se algo falhar, o sistema degrada graciosamente com fallback

