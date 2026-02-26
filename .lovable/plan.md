

# Limpeza e Padronizacao da Documentacao (Padrao GitHub)

## Contexto

O repositorio possui documentacao desatualizada e fora do padrao mundial do GitHub. O README.md e generico (template Lovable com placeholders), o `.lovable/plan.md` contem um plano ja executado, e faltam arquivos padrao de projetos bem organizados.

## Padrao GitHub recomendado

Repositorios bem organizados possuem:
- **README.md** - Descricao do projeto, tech stack, setup, estrutura
- **LICENSE** - Licenca do software
- **CHANGELOG.md** - Historico de versoes
- **.gitignore** - Ja existe, ok
- Pasta `docs/` - Documentacao tecnica complementar

## Alteracoes

### 1. Reescrever `README.md`

Substituir o template generico por um README profissional contendo:
- Nome e descricao do projeto (CCO AS Brasil - Centro de Controle Operacional)
- Badges (versao, status)
- Screenshot ou descricao visual
- Tech Stack (React, Vite, TypeScript, Tailwind, Supabase, shadcn/ui, Recharts)
- Arquitetura do sistema (roles: Admin, Supervisor, Operador, Motorista, Cliente)
- Estrutura de pastas principal
- Como rodar localmente (setup com npm/bun)
- Edge Functions disponiveis
- Link do deploy

### 2. Criar `CHANGELOG.md`

Historico de versoes baseado no que ja existe em `src/lib/version.ts`:
- v2.1.0 (2026-02-17) - Limpeza geral, remocao login de campo, cadastro unificado
- v2.0.0 - Redesign com Supabase Auth unificado
- Formato: Keep a Changelog (keepachangelog.com)

### 3. Limpar `.lovable/plan.md`

O conteudo atual e um plano ja executado (filtro de graficos da auditoria). Substituir por uma descricao breve da arquitetura atual do sistema, util como referencia interna.

### 4. Manter `docs/apps-script-sync.js`

Este arquivo e documentacao util (script de integracao Google Sheets). Permanece.

### 5. Atualizar `package.json`

Corrigir o campo `name` de `vite_react_shadcn_ts` para `cco-as-brasil`.

### 6. Atualizar `src/lib/version.ts`

Bump para v2.2.0 com data atual (2026-02-26) refletindo a limpeza de documentacao e organizacao.

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| README.md | Reescrever completo |
| CHANGELOG.md | Criar novo |
| .lovable/plan.md | Substituir conteudo |
| package.json | Corrigir campo name |
| src/lib/version.ts | Bump versao |

