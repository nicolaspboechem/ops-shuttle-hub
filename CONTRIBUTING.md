# Contribuindo com o CCO AS Brasil

Obrigado pelo interesse em contribuir! Este guia explica como participar do desenvolvimento do projeto.

## Pré-requisitos

- Node.js 18+
- Bun (gerenciador de pacotes)
- Conta no [Lovable](https://lovable.dev) ou ambiente local configurado

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Estilo | Tailwind CSS, shadcn/ui |
| Backend | Supabase (Auth, Database, Edge Functions, Storage) |
| Estado | TanStack React Query |
| Roteamento | React Router v6 |

## Configuração Local

```bash
# Clone o repositório
git clone <url-do-repo>
cd cco-as-brasil

# Instale as dependências
bun install

# Inicie o servidor de desenvolvimento
bun run dev
```

## Estrutura do Projeto

```
src/
├── components/       # Componentes React
│   ├── app/          # Componentes do app mobile (operador, motorista, supervisor)
│   ├── layout/       # Layout e navegação
│   ├── ui/           # Componentes base (shadcn/ui)
│   └── ...           # Módulos por domínio
├── hooks/            # Custom hooks
├── lib/              # Utilitários, tipos e contextos
├── pages/            # Páginas/rotas
└── integrations/     # Configuração Supabase
supabase/
├── functions/        # Edge Functions (Deno)
└── migrations/       # Migrações do banco de dados
```

## Convenções de Código

### Geral

- **Idioma do código**: variáveis, funções e componentes em **português** (seguindo o padrão do projeto)
- **Commits**: mensagens claras e descritivas em português
- **TypeScript**: sempre tipado, evitar `any`

### Componentes

- Componentes pequenos e focados (responsabilidade única)
- Usar design tokens do `index.css` — nunca cores hardcoded
- Preferir `shadcn/ui` para componentes de interface
- Hooks customizados para lógica reutilizável

### Estilo

- Usar classes semânticas do Tailwind (`bg-primary`, `text-muted-foreground`, etc.)
- Nunca usar cores diretas (`bg-blue-500`, `text-white`) — sempre tokens do design system
- Suportar dark mode via variáveis CSS

## Fluxo de Contribuição

1. Crie uma branch a partir da `main`: `git checkout -b feat/minha-feature`
2. Faça suas alterações seguindo as convenções acima
3. Teste localmente com `bun run dev`
4. Faça commit e push da branch
5. Abra um Pull Request descrevendo as mudanças

## Edge Functions (Supabase)

As Edge Functions usam **Deno** (não Node.js). Ao criar ou modificar:

- Arquivo principal: `supabase/functions/<nome>/index.ts`
- Sempre incluir headers CORS
- Testar via `supabase functions serve` localmente

## Reportando Bugs

Abra uma issue com:

- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs. atual
- Screenshots (se aplicável)

## Dúvidas

Entre em contato com a equipe de desenvolvimento para orientações adicionais.
