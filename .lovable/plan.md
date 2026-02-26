# CCO AS Brasil — Arquitetura do Sistema

## Visão Geral

Sistema de Centro de Controle Operacional para gestão de frotas e transporte em eventos. PWA com suporte a múltiplos perfis de usuário.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL com RLS, Edge Functions, Storage)
- **Estado:** TanStack React Query com realtime subscriptions
- **Deploy:** Lovable Cloud

## Módulos Principais

| Módulo | Descrição |
|--------|-----------|
| Eventos | Criação e configuração de operações |
| Viagens | Transfer, Shuttle e Missões |
| Motoristas | Cadastro, escalas, presença, localização |
| Veículos | Cadastro, vistoria, KM, combustível |
| Auditoria | Relatórios e gráficos operacionais |
| App Mobile | Interfaces PWA por role (motorista, operador, supervisor, cliente) |

## Convenções

- Componentes em `src/components/<módulo>/`
- Hooks de dados em `src/hooks/use<Recurso>.ts`
- Utilitários em `src/lib/utils/`
- Edge Functions em `supabase/functions/<nome>/index.ts`
- Versão do app em `src/lib/version.ts`
