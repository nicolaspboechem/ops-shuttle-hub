

# Filtro "Minhas Viagens" -- escondido no menu, ativo por padrao

## Resumo

Adicionar um filtro silencioso que ja vem **ativado por padrao**, mostrando apenas as viagens criadas/iniciadas pelo usuario logado. O toggle para desativar fica **escondido dentro do menu dropdown** (os tres pontinhos no header), discreto para nao chamar atencao.

## Como funciona

- Ao abrir o app, o supervisor/operador ve **apenas suas viagens** (filtro ativo)
- Para ver todas as viagens, o usuario precisa abrir o menu (tres pontinhos) e clicar em "Ver todas as viagens"
- Os KPIs e contadores refletem apenas as viagens filtradas
- O filtro se aplica tanto a viagens ativas quanto encerradas

## Mudancas

### 1. `src/pages/app/AppSupervisor.tsx`

**Novo state:**
- `apenasMinhas` (boolean, default `true`)

**Filtro aplicado no memo `viagensFiltradas`:**
- Apos filtrar por `filtroTipo`, adicionar condicao: se `apenasMinhas`, manter apenas viagens onde `v.criado_por === user?.id || v.iniciado_por === user?.id`
- Isso afeta automaticamente `viagensAtivas`, `viagensEncerradas`, `summary` e toda a cadeia de memos

**Toggle no DropdownMenu (header):**
- Adicionar um item no dropdown entre "Trocar Evento" e "Sair" com icone de olho
- Texto: "Ver todas as viagens" quando filtro ativo, "Ver apenas minhas" quando desativado
- Sem destaque visual, apenas um item de menu comum

### 2. `src/pages/app/AppOperador.tsx`

- Mesma logica: state `apenasMinhas` default `true`
- Mesmo filtro no memo `viagensFiltradas`
- Mesmo item no dropdown menu

## Detalhes tecnicos

O filtro verifica dois campos da tabela `viagens`:
- `criado_por` (uuid): quem criou a viagem
- `iniciado_por` (uuid): quem iniciou/deu play na viagem

A condicao e `OR` -- se o usuario criou OU iniciou, ele ve a viagem. Isso cobre o caso de um supervisor criar e outro iniciar.

Nenhuma mudanca no backend e necessaria. O RLS continua filtrando por evento normalmente; este filtro e puramente front-end sobre os dados ja carregados.

## Arquivos afetados

- `src/pages/app/AppSupervisor.tsx` -- state + filtro + item no dropdown
- `src/pages/app/AppOperador.tsx` -- mesma logica

