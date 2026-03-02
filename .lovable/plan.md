

# Atualizar versao para V3.1.0

## Mudancas desde V3.0.0

Todas as alteracoes feitas nesta sessao se enquadram como **MINOR** (novas funcionalidades) e **PATCH** (correcoes de bugs), sem quebra de compatibilidade. A versao adequada e **3.1.0**.

## Arquivos a alterar

### 1. `src/lib/version.ts`

- `APP_VERSION`: de `'3.0.0'` para `'3.1.0'`
- `APP_BUILD_DATE`: de `'2026-02-26'` para `'2026-03-02'`

### 2. `CHANGELOG.md`

Adicionar nova secao `[3.1.0] - 2026-03-02` acima da `[3.0.0]`, com o seguinte conteudo:

```text
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
```

