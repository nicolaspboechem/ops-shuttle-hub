
# Melhorias nos Alertas de Combustivel - CCO e Supervisor

## Resumo

Adicionar acoes interativas nos cards de alerta de combustivel no Dashboard (CCO) e transformar o fluxo do Supervisor para uma experiencia mais completa.

---

## 1. Dashboard CCO - Menu de 3 pontos nos cards

Cada card de alerta de combustivel no Dashboard (desktop e mobile) ganhara um botao de 3 pontos (MoreVertical) com as seguintes opcoes:

- **Chamar de volta para a base** - Muda o status do alerta para `pendente`
- **Enviar para manutencao** - Muda o status do veiculo para `em_manutencao` na tabela `veiculos` e resolve o alerta
- **Resolver** - Marca o alerta como `resolvido`

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Dashboard.tsx` | Adicionar DropdownMenu com 3 pontos em cada card de alerta. Importar `useAlertasFrota` com `atualizarStatus`. Adicionar funcao para enviar veiculo para manutencao (update em `veiculos`). |
| `src/components/dashboard/DashboardMobile.tsx` | Mesmo tratamento: DropdownMenu com 3 pontos em cada card de alerta de combustivel. |

### Estrutura do card atualizado

```text
[Fuel icon] ABC-1234  Edenilson     [1/4] [Aberto]  [...]
                                                       |
                                          Chamar p/ Base
                                          Enviar p/ Manutencao
                                          Resolver
```

---

## 2. Supervisor - Modal com acoes completas

O `SupervisorAlertasModal` ja existe e funciona bem como bottom sheet. O ajuste sera:

- Adicionar a opcao **"Enviar para manutencao"** ao lado das acoes existentes (Chamar Base / Resolver)
- Manter o modal como esta (bottom sheet), pois e o padrao mobile do app

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `src/components/app/SupervisorAlertasModal.tsx` | Adicionar botao "Manutencao" que atualiza o status do veiculo para `em_manutencao` e resolve o alerta. Importar `supabase` para o update direto. |

---

## 3. Logica de "Enviar para Manutencao"

Ao clicar em "Enviar para manutencao":

1. Atualizar `veiculos.status` para `em_manutencao` usando `veiculo_id` do alerta
2. Resolver o alerta (`status = 'resolvido'`)
3. Exibir toast de confirmacao

---

## 4. Versao

Atualizar `APP_VERSION` para `1.7.1` em `src/lib/version.ts`.

---

## Resumo de arquivos

| Arquivo | Tipo |
|---|---|
| `src/pages/Dashboard.tsx` | Editar |
| `src/components/dashboard/DashboardMobile.tsx` | Editar |
| `src/components/app/SupervisorAlertasModal.tsx` | Editar |
| `src/lib/version.ts` | Editar |

Nao requer mudancas no banco de dados -- os campos `veiculos.status` e `alertas_frota.status` ja existem.
