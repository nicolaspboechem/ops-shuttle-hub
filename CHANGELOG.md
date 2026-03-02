# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [3.1.0] - 2026-03-02

### Adicionado
- Edicao de PAX Ida no modal de edicao do CCO Desktop (EditViagemModal)
- Campo de Observacao editavel no modal de edicao do CCO Desktop
- Componente ObservacaoUnificada para edicao inline de observacoes no mobile
- Gravacao do campo `iniciado_por` ao iniciar viagens (auditoria)

### Corrigido
- Coluna "Iniciado por" nas tabelas de viagens agora exibe nome real (fallback para `criado_por`)
- Divergencia de status entre supervisores: hook Staff sincronizado com logica do CCO
- Hook Staff agora grava `h_retorno` corretamente (nao sobrescreve `h_chegada`)
- Reducao de latencia do throttle de realtime (3s/5s) para propagacao mais rapida de status

## [3.0.0] - 2026-02-26

### Alterado
- Rota única de campo `/app/:eventoId` com redirecionamento automático por role
- Layout fixo estilo app nativo (header e bottom nav fixos, conteúdo com scroll isolado)
- Redirecionamento inteligente pós-login por dispositivo e role
- Remoção da seleção manual de modo para admins no hub de eventos

## [2.2.0] - 2026-02-26

### Alterado
- Documentação padronizada no formato GitHub (README, CHANGELOG)
- Gráficos da Auditoria agora filtrados pelas abas de operação (sem dropdown redundante)
- Limpeza geral de código e organização de arquivos

## [2.1.0] - 2026-02-17

### Adicionado
- Cadastro unificado de motoristas, veículos e pontos de embarque
- Sistema de vistoria de veículos com wizard e histórico
- Alertas de frota consolidados e detalhados
- Painel público para eventos com rotas shuttle

### Removido
- Login de campo legado (migrado para Supabase Auth)

### Corrigido
- Performance de queries com paginação e throttle de refetch
- Correções de layout mobile em diversos componentes

## [2.0.0] - 2026-01-15

### Alterado
- Redesign completo da interface com shadcn/ui
- Autenticação unificada via Supabase Auth (email + telefone)
- Sistema de roles e permissões (admin, supervisor, operador, motorista, cliente)
- Migração de dados para Supabase (PostgreSQL + RLS)

### Adicionado
- App mobile PWA para motoristas e clientes
- Sistema de missões e escalas
- Dashboard com métricas em tempo real
- Mapa de serviço operacional
- Edge Functions para automações

## [1.0.0] - 2025-10-01

### Adicionado
- Versão inicial do sistema
- Gestão básica de viagens (transfer e shuttle)
- Sincronização com Google Sheets via Apps Script
- Painel operacional web
