
# Arquitetura Atual do Sistema

## Resumo

Sistema de gestão de transporte para eventos. Cadastro centralizado de usuários na aba `/usuarios` com roles: Admin, Supervisor, Operador, Motorista, Cliente. Dentro dos eventos, a equipe é vinculada (não criada inline). Login de campo (motoristas/staff) foi removido — apenas Supabase Auth.

## Autenticação

- **Supabase Auth** para todos os usuários
- Admin: login por email
- Outros: login por telefone + senha
- Roles armazenadas em `user_roles` (enum: admin, user, motorista, supervisor, operador, cliente)
- Profiles em `profiles` (user_type, login_type, telefone, email)

## Estrutura de Páginas

- `/auth` - Login
- `/usuarios` - Cadastro universal de usuários com filtros por tipo
- `/eventos` - Listagem de eventos
- `/evento/:id/*` - Painel do evento (dashboard, operação, equipe, etc.)
- `/app/:eventoId/*` - Apps de campo (supervisor, operador, motorista, cliente) — protegidos por AdminRoute

## Tabelas Principais

- `profiles`, `user_roles`, `user_permissions`
- `eventos`, `evento_usuarios`
- `motoristas`, `veiculos`, `viagens`, `viagem_logs`
- `missoes`, `motorista_presenca`, `escalas`, `escala_motoristas`
- `pontos_embarque`, `ponto_motoristas`, `rotas_shuttle`
- `alertas_frota`, `veiculo_fotos`, `veiculo_vistoria_historico`

## Removido (limpeza concluída)

- Tabelas: `motorista_credenciais`, `staff_credenciais`
- Edge functions: `driver-login`, `driver-register`, `staff-login`, `staff-register`, `migrate-field-users`
- Páginas: `LoginMotorista`, `LoginEquipe`
- Componentes: `DriverRoute`, `StaffRoute`, `EditMotoristaLoginModal`, `EditStaffLoginModal`
- Role: `coordenador` (admin assume todas as funções)
