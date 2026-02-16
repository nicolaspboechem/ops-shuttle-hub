

# Botao de Atalho para Deslocamento no Painel CCO

## Resumo

Adicionar um botao amarelo "Deslocamento" ao lado do botao "Nova Missao" no header do painel de missoes do CCO. Remover a opcao de deslocamento do modal de selecao de tipo de missao. Ao criar um deslocamento, a missao sera criada ja no estado "em_andamento" (auto-iniciada), gerando automaticamente a viagem vinculada.

## Mudancas

### 1. `src/components/motoristas/MissoesPanel.tsx`

- Adicionar botao amarelo "Deslocamento" com icone Route ao lado do botao "Nova Missao" no header (linha ~191)
- O botao abre diretamente o `MissaoDeslocamentoModal` sem passar pelo `MissaoTipoModal`
- Alterar o `onSave` do `MissaoDeslocamentoModal` para, apos criar a missao com `createMissao`, chamar automaticamente `iniciarMissao` no ID retornado (sequencia: criar pendente, aceitar, iniciar -- tudo automatico)

### 2. `src/components/motoristas/MissaoTipoModal.tsx`

- Remover a opcao "Deslocamento" do modal de selecao de tipo
- Manter apenas "Missao Instantanea" e "Missao Agendada"

### 3. `src/components/motoristas/MissaoDeslocamentoModal.tsx`

- Sem alteracoes visuais no modal em si
- A logica de auto-iniciar sera tratada no componente pai (MissoesPanel e AppSupervisor)

### 4. `src/pages/app/AppSupervisor.tsx`

- Mesmo ajuste no `onSave` do `MissaoDeslocamentoModal`: apos criar, chamar `iniciarMissao` automaticamente
- Manter o fluxo existente de abertura via `NewActionModal`

### 5. `src/components/app/NewActionModal.tsx`

- Nenhuma alteracao necessaria -- o deslocamento ja aparece como opcao separada no modal do supervisor

## Fluxo Tecnico do Auto-Inicio

```text
1. Usuario clica "Deslocamento" (botao amarelo)
2. Modal abre -> preenche motorista, origem, destino
3. Clica "Criar Deslocamento"
4. createMissao() cria com status 'pendente' -> retorna { id }
5. aceitarMissao(id) atualiza para 'aceita'
6. iniciarMissao(id) atualiza para 'em_andamento' + cria viagem vinculada + atualiza motorista para 'em_viagem'
7. Modal fecha -> toast "Deslocamento iniciado"
```

A funcao `iniciarMissao` ja cuida de toda a logica de criar a viagem, vincular a missao e atualizar o status do motorista. O `aceitarMissao` e necessario antes pois `iniciarMissao` valida que a missao nao pode pular de 'pendente' para 'em_andamento' diretamente.

## Detalhes Tecnicos

No `MissoesPanel`, o botao ficara assim:

```text
[Nova Missao]  [Deslocamento]  (amarelo com icone Route)
```

O callback do deslocamento sera:

```typescript
onSave={async (data) => {
  const missao = await createMissao(data);
  if (missao?.id) {
    await aceitarMissao(missao.id);
    await iniciarMissao(missao.id);
  }
}}
```

O mesmo padrao sera aplicado no `AppSupervisor.tsx`.
