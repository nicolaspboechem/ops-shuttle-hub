

# Corrigir Nome do Supervisor e Exibicao de Veiculos

## Problema 1: Nome do supervisor nao aparece

O `AppSupervisor.tsx` usa `useAuth()` (Supabase Auth) para obter o nome do usuario. Porem, o supervisor Rafael Chaffim faz login via **Staff JWT** (telefone 21967686164), que usa `StaffAuthContext`. O `useAuth()` retorna `user: null` e `profile: null` para usuarios Staff, resultando em nome vazio no app.

O perfil no banco esta correto: `full_name: "Rafael Chaffim"`, e o `staff-login` retorna esse nome no JWT (`user_nome`). O problema e que o app nao le esse dado.

**Correcao**: No `AppSupervisor.tsx`, importar `useStaffAuth` e usar `staffSession.user_nome` como fonte primaria do nome. Tambem corrigir o `signOut` para usar o signOut do Staff (atualmente chama `signOut` do Supabase Auth, que nao faz nada para usuarios Staff).

### Arquivo: `src/pages/app/AppSupervisor.tsx`

- Adicionar import de `useStaffAuth`
- Obter `staffSession` e `signOut` do staff
- Usar `staffSession?.user_nome` como userName principal, com fallback para `profile?.full_name` e `user?.email`
- Substituir o `signOut` do `useAuth()` pelo do `useStaffAuth()` no botao Sair e no dropdown

---

## Problema 2: Exibicao de veiculos - nome/apelido como principal

Atualmente os componentes do app supervisor ja usam `nome || placa` na maioria dos lugares, mas ha inconsistencias:

1. **`VeiculoCardSupervisor.tsx`** (linha 121): Ja mostra `veiculo.nome || veiculo.placa` como principal - OK
2. **`SupervisorMotoristaCard.tsx`** (linha 113): Ja mostra `motorista.veiculo.nome || motorista.veiculo.placa` - OK
3. **`ViagemCardOperador.tsx`** (linha 103): Usa `viagem.veiculo?.nome || viagem.placa` - OK em logica, mas o texto ao lado do motorista mostra `nomeVeiculo` sem destaque visual. Melhorar para mostrar nome em negrito e placa secundaria quando ambos existem.

**Correcao**: No `ViagemCardOperador.tsx`, quando o veiculo tem nome E placa, exibir o nome como texto principal e a placa entre parenteses em tamanho menor. Atualmente mostra apenas um dos dois.

### Arquivo: `src/components/app/ViagemCardOperador.tsx`

Na linha 258-264, alterar a exibicao do veiculo:
- Se tem `veiculo.nome`: mostrar nome em destaque + `(placa)` em texto secundario
- Se nao tem nome: mostrar apenas placa

---

## Resumo de Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/app/AppSupervisor.tsx` | Usar `useStaffAuth` para nome + signOut |
| `src/components/app/ViagemCardOperador.tsx` | Nome do veiculo como principal, placa como secundaria |

## Ordem

1. `AppSupervisor.tsx` - corrigir nome e logout
2. `ViagemCardOperador.tsx` - melhorar exibicao de veiculo

