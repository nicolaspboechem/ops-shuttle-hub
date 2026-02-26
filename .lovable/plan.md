
Objetivo
- Garantir que, ao vincular um usuário com role motorista na aba Equipe, ele apareça imediatamente na aba Motoristas do mesmo evento.
- Ajustar autenticação para que supervisor e operador (e demais não-motoristas) usem apenas e-mail; apenas motoristas usam telefone.

Diagnóstico encontrado
1) Inconsistência de vínculo por evento:
- Hoje, ao vincular motorista em `src/pages/EventoUsuarios.tsx`, é criado registro em `motoristas`, mas não é garantido vínculo em `evento_usuarios`.
- Como a autorização por evento usa `has_event_access` (baseada em `evento_usuarios`), isso pode quebrar fluxos por evento para usuários de campo.

2) Sensação de “não apareceu na aba Motoristas”:
- A aba Motoristas usa `useMotoristas` com cache em memória (60s) em `src/hooks/useCadastros.ts`.
- Se a aba Motoristas foi aberta recentemente com lista vazia, pode manter cache “fresco” e pular refetch, atrasando a visualização do novo vínculo.

3) Regra de login divergente:
- Em `src/pages/Usuarios.tsx`, o login por telefone ainda está configurado para todo não-admin.
- Em `src/pages/Auth.tsx`, o texto e o toggle ainda sugerem telefone para “equipe” também.

Plano de implementação

1) Corrigir o fluxo de vínculo na Equipe (fonte da verdade do evento)
Arquivos:
- `src/pages/EventoUsuarios.tsx`

Mudanças:
- No `handleAddUserToEvent`:
  - Para role `motorista`, trocar `insert` direto por lógica idempotente:
    - Buscar `motoristas` por (`evento_id`, `user_id`).
    - Se existir, atualizar dados básicos (nome/telefone/ativo=true).
    - Se não existir, inserir.
  - Em seguida, garantir vínculo em `evento_usuarios` para o mesmo usuário/evento com role `motorista` (upsert/insert com tratamento de conflito).
- Resultado: toda pessoa vinculada ao evento fica consistente nas duas dimensões (cadastro operacional e autorização por evento).

2) Remover atraso por cache na aba Motoristas
Arquivos:
- `src/hooks/useCadastros.ts`

Mudanças:
- Ajustar estratégia do `useMotoristas` para “stale-while-revalidate”:
  - Pode continuar usando cache para render inicial rápida.
  - Mas sempre disparar um refetch silencioso ao montar (sem spinner), mesmo com cache fresco.
- Resultado: após vincular na Equipe e abrir Motoristas, a lista atualiza imediatamente sem esperar expirar 60s.

3) Backfill de consistência para dados já existentes
Arquivos:
- nova migration em `supabase/migrations/...sql`

Mudanças SQL:
- Inserir em `evento_usuarios` todos os motoristas já existentes em `motoristas` com `user_id` e `evento_id` preenchidos, quando ainda não houver vínculo (`ON CONFLICT DO NOTHING`).
- (Opcional, se quiser endurecer regra): criar índice único parcial para evitar duplicidade de motorista por usuário+evento quando `user_id` não for nulo.

4) Enforce de login por role (somente motorista por telefone)
Arquivos:
- `src/pages/Usuarios.tsx`
- `src/pages/Auth.tsx`
- `supabase/functions/create-user/index.ts`
- `src/lib/auth/AuthContext.tsx` (validação final no sign-in)

Mudanças:
- `Usuarios.tsx`:
  - Alterar regra de criação: telefone apenas quando `newUserType === 'motorista'`.
  - Supervisor/operador/cliente/admin: criação com e-mail.
- `create-user` (edge function):
  - Validar server-side:
    - `motorista` => exige `login_type=phone`.
    - não-motorista => exige `login_type=email`.
  - Rejeitar combinações inválidas com erro claro (evita bypass por chamada manual).
- `Auth.tsx`:
  - Atualizar cópia do login para deixar explícito: “Somente motoristas entram por telefone”.
- `AuthContext.tsx`:
  - Após `signIn`, validar role do usuário (`user_roles`) vs modo usado.
  - Se mismatch (ex.: operador tentando telefone), efetuar `signOut` e retornar erro amigável.
- Resultado: regra de autenticação alinhada com a nova estrutura e aplicada também no backend.

Validação (E2E)
1) Em Usuários:
- Criar supervisor e operador: formulário deve exigir e-mail (não telefone).
- Criar motorista: formulário deve exigir telefone.

2) Em Equipe do evento “teste novo modal”:
- Vincular motorista via dropdown.
- Confirmar toast de sucesso.

3) Em Motoristas do mesmo evento:
- O motorista deve aparecer sem necessidade de hard refresh/esperar 60s.

4) Login:
- Motorista: telefone funciona, e-mail bloqueia com mensagem orientativa.
- Supervisor/Operador: e-mail funciona, telefone bloqueia com mensagem orientativa.

Riscos e cuidados
- Se houver contas antigas de supervisor/operador criadas só com telefone, elas passarão a falhar no login por telefone após o enforce; para esses casos, será necessário cadastrar e-mail e resetar senha.
- Não vamos mover roles para `profiles`; roles continuam em `user_roles` (modelo seguro atual).

Critério de pronto
- Vínculo de motorista pela Equipe refletindo imediatamente na aba Motoristas.
- Consistência de autorização por evento garantida (`evento_usuarios` + `motoristas`).
- Login estritamente por role: motorista=telefone, supervisor/operador=email.
