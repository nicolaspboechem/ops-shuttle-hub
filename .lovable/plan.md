
# Plano: Corrigir Erro 409 e Garantir Criação de Login no Wizard e Card

## Problema Identificado

O erro **409 (Conflict)** ocorre quando o telefone informado **já está em uso por outro motorista** no sistema. A Edge Function `driver-register` retorna esse código na linha 117-122:

```typescript
if (phoneExists) {
  return new Response(
    JSON.stringify({ error: 'Este telefone já está em uso por outro motorista' }),
    { status: 409, ... }
  );
}
```

### Comportamento Atual (Problemático)

1. Quando há erro 409, o wizard mostra toast genérico e **fecha imediatamente**
2. O usuário perde o contexto e precisa recomeçar do zero
3. Não há feedback claro sobre qual telefone está duplicado

---

## Solução

### 1. Tratar Erro 409 de Forma Amigável

Quando o `driver-register` retornar status 409:
- Mostrar mensagem clara: "Este telefone já está cadastrado para outro motorista"
- **NÃO fechar o wizard** - manter aberto no Step 3 para o usuário corrigir o telefone
- Destacar visualmente o campo de telefone com erro

### 2. Melhorar Tratamento de Erros no Wizard

| Situação | Comportamento Atual | Comportamento Novo |
|----------|--------------------|--------------------|
| Erro 409 (telefone duplicado) | Fecha wizard | Mantém aberto, destaca erro |
| Erro genérico | Fecha wizard | Mantém aberto, permite retry |
| Sucesso | Mostra credenciais | Mantém igual |

### 3. Manter Login Funcionando em Ambos os Lugares

- **Wizard (preferência)**: Criar login durante cadastro do motorista
- **Card/Modal (fallback)**: Se não criou pelo wizard, criar depois via `EditMotoristaLoginModal`

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/motoristas/CreateMotoristaWizard.tsx` | Tratar erro 409, não fechar em erro, ativar login por padrão |

---

## Seção Técnica

### Mudanças no CreateMotoristaWizard.tsx

#### 1. Estado para controle de erro

```typescript
const [loginError, setLoginError] = useState<string | null>(null);
```

#### 2. handleSubmit com tratamento de 409

```typescript
const handleSubmit = async () => {
  if (!nome.trim()) return;
  setIsSubmitting(true);
  setLoginError(null); // Limpar erro anterior
  
  try {
    const motoristaId = await onSubmit({
      nome: nome.trim(),
      telefone: telefone.trim(),
      veiculo_id: selectedVeiculoId || undefined,
    });
    
    if (criarLogin && telefone.trim() && senha.trim() && motoristaId) {
      const telefoneDigits = telefone.replace(/\D/g, '');
      
      const response = await supabase.functions.invoke('driver-register', {
        body: {
          motorista_id: motoristaId,
          telefone: telefoneDigits,
          senha: senha.trim(),
        },
      });

      // Verificar se é erro HTTP (como 409)
      if (response.error) {
        // Erro de rede ou função
        const errorMsg = response.error.message || 'Erro ao criar login';
        setLoginError(errorMsg);
        toast.error(`Motorista criado! Mas erro no login: ${errorMsg}`);
        // NÃO fecha - usuário pode corrigir e tentar novamente
        return;
      }

      // Verificar erro no corpo da resposta (409 retorna { error: "..." })
      if (response.data?.error) {
        setLoginError(response.data.error);
        toast.error(`Motorista criado! ${response.data.error}`);
        // NÃO fecha - volta para step 3 para correção
        setStep(3);
        return;
      }
      
      // Sucesso - mostrar credenciais
      setCreatedCredentials({
        login: telefoneDigits,
        password: senha.trim(),
      });
      setShowCredentialsModal(true);
    } else {
      // Sem login - fechar normalmente
      toast.success("Motorista criado com sucesso!");
      handleClose();
    }
  } catch (err: any) {
    console.error("Erro ao criar motorista:", err);
    toast.error("Erro ao criar motorista");
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 3. Iniciar com "Criar login" ativado por padrão

```typescript
const [criarLogin, setCriarLogin] = useState(true); // Era false
```

#### 4. Exibir erro no Step 3

No Step 3, adicionar feedback visual quando há erro:

```typescript
{loginError && (
  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
    <p className="text-sm text-destructive flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      {loginError}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Corrija o telefone e tente novamente
    </p>
  </div>
)}
```

#### 5. Validação de telefone mais rigorosa

```typescript
const telefoneDigits = telefone.replace(/\D/g, '');
const canProceedStep3 = !criarLogin || (
  telefoneDigits.length >= 10 && 
  telefoneDigits.length <= 11 && 
  senha.trim().length >= 4
);
```

---

## Fluxo Corrigido

```text
1. Usuário abre wizard - "Criar login" já vem ativado por padrão
2. Preenche dados e avança
3. No Step 4, clica "Criar Motorista"
4. Sistema cria motorista na tabela
5. Sistema chama driver-register:
   
   SE sucesso (201) → Mostra modal de credenciais → Fecha
   
   SE erro 409 → Mostra toast + mantém wizard aberto no Step 3
                  → Usuário corrige telefone e clica novamente
   
   SE outro erro → Mostra toast + mantém aberto para retry
```

---

## Resultado Esperado

1. Erro 409 mostra mensagem clara: "Este telefone já está em uso por outro motorista"
2. Wizard **não fecha** em caso de erro - usuário pode corrigir
3. "Criar login" vem **ativado por padrão**
4. Validação de telefone exige 10-11 dígitos
5. Login continua funcionando pelo card/modal como fallback
