

# Atualizar versao para 1.0.1

## Alteracao

**Arquivo**: `src/lib/version.ts`

- `APP_VERSION`: de `'1.0.0'` para `'1.0.1'`
- `APP_BUILD_DATE`: de `'2026-02-04'` para `'2026-02-10'`

## Changelog implicito (v1.0.1)

- Corrigido: formularios e wizards perdendo estado ao trocar de aba (padrao block/hidden)
- Corrigido: CreateMotoristaWizard nao renderizado no JSX raiz
- Corrigido: cards Kanban de motoristas cortados (colunas ampliadas)
- Corrigido: clipping de layout em Motoristas e Veiculos (min-h-0)
- Corrigido: RotasShuttle usando renderizacao destrutiva

## Tecnico

Unica alteracao necessaria em `src/lib/version.ts` -- a versao ja e consumida automaticamente pela sidebar, apps mobile e pagina de configuracoes.
