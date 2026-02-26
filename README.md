# 🚌 CCO AS Brasil

**Centro de Controle Operacional** — Sistema de gestão de frotas e operações de transporte para eventos.

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
[![Contribuição](https://img.shields.io/badge/contribuição-guia-orange)](./CONTRIBUTING.md)

## 📋 Sobre

O CCO AS Brasil é uma plataforma web/PWA para gerenciamento em tempo real de operações de transporte em eventos. Suporta operações de **Transfer** (ponto a ponto), **Shuttle** (rotas circulares) e **Missões** (deslocamentos avulsos).

**Deploy:** [cco-asbrasil.lovable.app](https://cco-asbrasil.lovable.app)

## 🛠 Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Estado | TanStack React Query |
| Gráficos | Recharts |
| Backend | Supabase (Auth, Database, Edge Functions, Storage) |
| Animações | Framer Motion |
| PWA | Service Worker, Web App Manifest |

## 👥 Roles do Sistema

| Role | Acesso |
|------|--------|
| **Admin** | Painel completo, gestão de usuários e eventos |
| **Supervisor** | Frota, motoristas, localizador, alertas |
| **Operador** | Operação de viagens, criação de shuttles/transfers |
| **Motorista** | App mobile — check-in, viagens, veículo |
| **Cliente** | App mobile — painel público, localizador |

## 📁 Estrutura de Pastas

```
src/
├── components/
│   ├── app/          # Componentes do app mobile (motorista, operador, cliente, supervisor)
│   ├── auditoria/    # Relatórios e gráficos de auditoria
│   ├── dashboard/    # Cards e painéis do dashboard
│   ├── eventos/      # Gestão de eventos
│   ├── layout/       # Sidebar, header, navegação
│   ├── localizador/  # Localização de motoristas e veículos
│   ├── mapa-servico/ # Mapa de serviço operacional
│   ├── motoristas/   # Gestão de motoristas e escalas
│   ├── rotas/        # Pontos de embarque e rotas
│   ├── shuttle/      # Métricas e tabelas de shuttle
│   ├── transfer/     # Métricas e tabelas de transfer
│   ├── ui/           # Componentes base (shadcn/ui)
│   ├── veiculos/     # Gestão e vistoria de veículos
│   └── viagens/      # Tabelas e filtros de viagens
├── hooks/            # Custom hooks (dados, auth, real-time)
├── lib/              # Utilitários, types, auth context
├── pages/            # Páginas da aplicação
└── integrations/     # Cliente e types do Supabase
supabase/
└── functions/        # Edge Functions (auto-checkout, sync, user management)
docs/                 # Documentação técnica complementar
```

## ⚡ Edge Functions

| Função | Descrição |
|--------|-----------|
| `auto-checkout` | Checkout automático de motoristas |
| `close-open-trips` | Encerramento de viagens abertas |
| `create-user` | Criação de usuários com role |
| `delete-user` | Remoção de usuários |
| `import-all-vehicles` | Importação em lote de veículos |
| `reset-password` | Reset de senha |
| `sync-data` | Sincronização com Google Sheets |
| `update-user-phone` | Atualização de telefone |

## 🚀 Setup Local

```bash
# Clonar o repositório
git clone <URL_DO_REPOSITORIO>
cd cco-as-brasil

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Requisitos: Node.js 18+ e npm (ou bun).

## 📄 Licença

Projeto proprietário — AS Brasil. Todos os direitos reservados.
