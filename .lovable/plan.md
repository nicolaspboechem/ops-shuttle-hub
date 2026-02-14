

# Analise de Inconsistencias e Melhorias: Localizacao, Missoes, Check-in/Check-out

## Inconsistencias Identificadas

### 1. Localizacao do motorista nao atualiza ao finalizar missao via CCO

**Onde:** `useMissoes.ts` -- funcoes `concluirMissao` e `cancelarMissao` (linhas 275-281)

Quando o CCO conclui ou cancela uma missao manualmente (via Kanban drag-drop), apenas o campo `status` da missao e atualizado. **Nao ha atualizacao de:**
- `motoristas.status` (deveria voltar para `disponivel`)
- `motoristas.ultima_localizacao` (deveria ir para o ponto de desembarque)
- `viagens` vinculada (deveria ser encerrada)

No app do motorista (`AppMotorista.tsx` linhas 314-365), a acao `finalizar` trata tudo corretamente: encerra viagem, atualiza status, atualiza localizacao. Mas no CCO, `concluirMissao` faz apenas `updateMissao(id, { status: 'concluida' })`.

**Impacto:** Motorista fica "fantasma" no Localizador -- aparece como `em_viagem` indefinidamente ate que outro evento (check-out, nova viagem) atualize o status.

### 2. Localizador nao considera missoes para agrupar motoristas por localizacao

**Onde:** `useLocalizadorMotoristas.ts` (linhas 92-100)

O hook do Localizador busca `viagens` com status `em_andamento` para determinar rotas, mas **nao busca missoes**. O agrupamento depende de `motoristas.ultima_localizacao` (campo de texto) e `motoristas.status`.

A pagina `PainelLocalizador.tsx` resolve isso parcialmente fazendo uma query separada de `missoes` e cruzando com `missoesPorMotorista`, mas o hook base nao tem essa informacao, causando:
- Cards no Localizador sem rota quando a rota esta na missao e nao na viagem
- Transicao visual dessinc: motorista em missao `aceita` ainda aparece na coluna `Base` ate que inicie a viagem

### 3. Check-out nao desvincula veiculo no proprio motorista

**Onde:** `useMotoristaPresenca.ts` -- `realizarCheckout` (linhas 298-343)

O checkout desvincula o veiculo do motorista (`motoristas.veiculo_id = null`), mas **nao limpa `veiculos.motorista_id`** no lado do veiculo. Isso cria uma inconsistencia bidirecional:
- `motoristas.veiculo_id` = null (correto)
- `veiculos.motorista_id` = motoristaId anterior (incorreto -- veiculo ainda "pensa" que esta vinculado)

A Edge Function `auto-checkout` faz a desvinculacao bidirecional corretamente, mas o checkout manual nao.

### 4. Missoes no app do motorista nao diferenciam visualmente Instantanea vs Agendada

**Onde:** `MissaoCardMobile.tsx`

O card mobile mostra `data_programada` e `horario_previsto` quando disponivel, mas nao ha badge ou indicador visual claro de tipo. Missoes instantaneas (sem data/horario) e agendadas (com data futura) parecem identicas exceto pela presenca/ausencia do horario.

### 5. Filtro de missoes no motorista usa `new Date()` direto em vez de `getAgoraSync()`

**Onde:** `MissaoCardMobile.tsx` (linha 130)

```typescript
missao.data_programada === new Date().toISOString().slice(0, 10)
```

Usa `new Date()` local do dispositivo em vez do horario sincronizado do servidor (`getAgoraSync()`), potencialmente mostrando "Hoje" erroneamente em dispositivos com relogio desajustado.

---

## Plano de Correcoes

### Correcao 1: Sincronizar status do motorista ao concluir/cancelar missao via CCO

**Arquivo:** `src/hooks/useMissoes.ts`

Reescrever `concluirMissao` e `cancelarMissao` para incluir:
- Encerrar a viagem vinculada (`viagens.status = 'encerrado'`, `encerrado = true`)
- Atualizar `motoristas.status = 'disponivel'` (verificando se nao tem outras viagens ativas)
- Atualizar `motoristas.ultima_localizacao` para o ponto_desembarque da missao
- Manter o `updateMissao` existente para o status da missao

### Correcao 2: Checkout bidirecional do veiculo

**Arquivo:** `src/hooks/useMotoristaPresenca.ts`

Na funcao `realizarCheckout`, adicionar a limpeza de `veiculos.motorista_id`:
```text
// Apos: motoristas.update({ veiculo_id: null })
// Adicionar: veiculos.update({ motorista_id: null }).eq('motorista_id', motoristaId)
```

### Correcao 3: Badge visual de tipo de missao no app do motorista

**Arquivo:** `src/components/app/MissaoCardMobile.tsx`

Adicionar badge contextual no header do card:
- Sem `data_programada` ou `data_programada === hoje` e sem `horario_previsto`: exibir badge "Instantanea" com icone de raio (Zap) em amarelo
- Com `horario_previsto`: exibir badge "Agendada" com icone de calendario em azul
- Com `data_programada` futura: exibir "Agendada para DD/MM" de forma destacada

### Correcao 4: Usar hora sincronizada no MissaoCardMobile

**Arquivo:** `src/components/app/MissaoCardMobile.tsx`

O componente precisa receber `dataOperacional` como prop (ja calculado no pai `AppMotorista.tsx`) para comparar datas corretamente, em vez de usar `new Date()`.

Alternativamente, passar `serverDate` como prop string `YYYY-MM-DD` do pai.

### Correcao 5: Melhoria no filtro/organizacao de missoes no app motorista

**Arquivo:** `src/pages/app/AppMotorista.tsx`

Reorganizar a lista de missoes `minhasMissoes` para:
1. Ordenar por prioridade de acao: `em_andamento` primeiro (acao de finalizar), depois `aceita` (acao de iniciar), depois `pendente` (acao de aceitar)
2. Dentro de cada grupo, ordenar por `horario_previsto` (mais cedo primeiro), fallback por `created_at`
3. Missoes sem horario (instantaneas) ficam antes das agendadas dentro do mesmo status

---

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useMissoes.ts` | Sincronizar motorista/viagem ao concluir/cancelar missao no CCO |
| `src/hooks/useMotoristaPresenca.ts` | Desvinculacao bidirecional de veiculo no checkout |
| `src/components/app/MissaoCardMobile.tsx` | Badge tipo missao (Instantanea/Agendada), hora sincronizada |
| `src/pages/app/AppMotorista.tsx` | Ordenacao inteligente de missoes, passar dataOperacional |

