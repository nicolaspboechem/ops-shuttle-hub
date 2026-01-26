

# Plano: Adicionar Botão "Criar Login" Visível no Card do Motorista

## Objetivo

Adicionar um botão "Criar Login" diretamente visível no card do motorista na página de Equipe, caso o motorista ainda não possua credenciais de acesso. Isso torna a ação mais acessível sem precisar abrir o menu dropdown.

---

## Situação Atual

- O card do motorista (`MembroCard`) já exibe controles de Check-in/Check-out
- A opção "Criar Login" existe **apenas** no menu dropdown (3 pontinhos)
- A propriedade `has_login` já está disponível no objeto `membro`

---

## Mudança Proposta

Adicionar um botão "Criar Login" na seção de informações adicionais do motorista, visível apenas quando `!membro.has_login`.

---

## Arquivo a Modificar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/EventoUsuarios.tsx` | Adicionar botão "Criar Login" no MembroCard |

---

## Detalhes da Implementação

### Local da Mudança

Dentro do componente `MembroCard`, na seção `{isMotorista && (...)}` (linhas 214-268), após os controles de Check-in/Check-out.

### Novo Botão

```tsx
{/* Botão Criar Login - visível apenas se motorista não tem login */}
{isMotorista && !membro.has_login && (
  <Button 
    size="sm" 
    variant="outline"
    className="w-full mt-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
    onClick={() => setLoginModalMembro(membro)}
  >
    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
    Criar Login de Acesso
  </Button>
)}
```

### Resultado Visual

Para motoristas **sem login**:
```text
┌────────────────────────────────────┐
│ [J] João Silva    🔑              │
│     Motorista | Disponível         │
├────────────────────────────────────┤
│ 📞 (11) 99999-9999                 │
│ 🚗 ABC-1234                        │
│                                    │
│ [✓ Check-in]                       │
│                                    │
│ [🔑 Criar Login de Acesso]  ← NOVO │
└────────────────────────────────────┘
```

Para motoristas **com login**:
```text
┌────────────────────────────────────┐
│ [J] João Silva    🔑 ✓            │
│     Motorista | Disponível         │
├────────────────────────────────────┤
│ 📞 (11) 99999-9999                 │
│ 🚗 ABC-1234                        │
│                                    │
│ [✓ Check-in]                       │
│                                    │
│ (sem botão - login já existe)      │
└────────────────────────────────────┘
```

---

## Benefícios

1. **Visibilidade**: Ação de criar login fica óbvia sem precisar procurar no menu
2. **UX Melhorada**: Menos cliques para executar a ação mais comum
3. **Feedback Visual**: Destaque em cor âmbar chama atenção para motoristas pendentes
4. **Consistência**: Usa o mesmo modal `EditMotoristaLoginModal` já existente

