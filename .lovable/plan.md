

# Correcao da Logica de Historico de Uso de Veiculos

**STATUS: ✅ IMPLEMENTADO**

## Conceito Central

O uso de um veiculo e definido pelo ciclo **vinculacao -> desvinculacao** no proprio veiculo, independentemente do motorista. Veiculos sao rotativos: motorista A pode vincular e motorista B pode usar depois. O pareamento e feito por ordem cronologica no veiculo, nao por motorista.

Cada ciclo de uso = 1 vinculacao seguida da proxima desvinculacao naquele veiculo. A duracao = `desvinculacao.created_at - vinculacao.created_at`.

## Fontes de Dados

A tabela `veiculo_vistoria_historico` e a fonte principal. Registros relevantes:

- `tipo_vistoria = 'vinculacao'` -- veiculo atribuido a um motorista
- `tipo_vistoria = 'desvinculacao'` -- veiculo liberado (checkout, troca, supervisor, auto-checkout)

O checkout do motorista (`useMotoristaPresenca.handleCheckout`) ja registra desvinculacao na tabela (implementado na iteracao anterior). O mesmo vale para supervisor e auto-checkout.

### Todas as origens de desvinculacao (ja implementadas)

| Origem | Arquivo | O que acontece |
|--------|---------|----------------|
| Checkout do motorista | `useMotoristaPresenca.ts` | Motorista encerra expediente, veiculo desvinculado e registrado |
| Troca de veiculo pelo CCO | `VincularVeiculo.tsx` | Operador troca veiculo, desvinculacao do anterior registrada |
| Supervisor desvincula | `SupervisorFrotaTab.tsx` | Supervisor remove veiculo pelo app, registrado |
| Virada do dia (auto-checkout) | `auto-checkout/index.ts` | Sistema encerra expediente automaticamente, desvinculacao em batch registrada |
| Checkout com observacao | `CheckoutModal.tsx` | Checkout formal com nota, desvinculacao registrada |

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useVeiculoPresencaHistorico.ts` | Nova logica de pareamento sequencial por veiculo |
| `src/components/veiculos/VeiculosUsoAuditoria.tsx` | Colunas e labels atualizados |
| `src/components/veiculos/VeiculoUsoDetalheModal.tsx` | Exibir novos campos no detalhe |
