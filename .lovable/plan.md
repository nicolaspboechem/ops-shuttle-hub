

# Missao Instantanea + Gerenciamento Completo de Missoes no CCO

## Resumo

Duas melhorias principais:

1. **Missoes criadas via "Chamar Base" devem ser gerenciaveis como missoes comuns** - aceitar, iniciar, concluir pelo CCO (ja funciona pois usam o mesmo `createMissao`; nenhuma mudanca necessaria aqui).

2. **Criar dois modos de criacao de missao**: "Missao Instantanea" (rapida, so motorista + origem + destino) e "Missao Agendada" (formulario completo atual). Isso se aplica ao CCO, App Supervisor e App Operador.

---

## Parte 1: Missoes de Retorno a Base

As missoes criadas pelo "Chamar Base" no Mapa de Servico ja usam `createMissao` do hook `useMissoes`, que insere na tabela `missoes` com status `pendente`. Como ja adicionamos as acoes "Aceitar" e "Iniciar" no CCO (aba Motoristas), essas missoes ja podem ser gerenciadas normalmente. **Nenhuma mudanca necessaria.**

---

## Parte 2: Dois Modos de Criacao de Missao

### Fluxo proposto

Ao clicar "Nova Missao" (CCO ou apps), abre um modal intermediario com duas opcoes:

```text
+----------------------------------+
|      Que tipo de missao?         |
|                                  |
|  [Zap] Missao Instantanea        |
|  Rapida: motorista, A -> B       |
|                                  |
|  [Calendar] Missao Agendada      |
|  Completa: data, horario, pax... |
+----------------------------------+
```

### Missao Instantanea
- Campos: **Motorista** (combobox), **Origem** (select), **Destino** (select)
- Titulo auto-gerado: "Missao: {Origem} -> {Destino}"
- Prioridade: `normal`, data: hoje, pax: 0
- Um clique para criar

### Missao Agendada
- Formulario atual completo (MissaoModal.tsx sem mudancas)

---

## Arquivos a modificar

### 1. Novo: `src/components/motoristas/MissaoTipoModal.tsx`
Modal intermediario com duas opcoes: Instantanea e Agendada. Ao selecionar, emite callback com o tipo escolhido.

### 2. Novo: `src/components/motoristas/MissaoInstantaneaModal.tsx`
Formulario simplificado com apenas 3 campos: Motorista (combobox com busca), Origem (select de pontos), Destino (select de pontos). Titulo auto-gerado. Chama `onSave` com os mesmos dados do `MissaoInput`.

### 3. `src/pages/Motoristas.tsx` (CCO)
- Botao "Nova Missao" abre `MissaoTipoModal` em vez de `MissaoModal` diretamente
- Conforme a escolha, abre `MissaoInstantaneaModal` ou `MissaoModal`

### 4. `src/pages/app/AppSupervisor.tsx`
- Quando `handleActionSelect('missao')` eh chamado, abre `MissaoTipoModal`
- Conforme a escolha, abre `MissaoInstantaneaModal` ou `MissaoModal`

### 5. `src/pages/app/AppOperador.tsx`
- Adicionar suporte a criacao de missoes (atualmente so cria viagens transfer/shuttle)
- Adicionar opcao "Missao" no seletor de tipo, seguindo o mesmo padrao do Supervisor
- Usar `NewActionModal` + `MissaoTipoModal` + modais de missao

### 6. `src/components/app/NewActionModal.tsx`
- Nenhuma mudanca: ja tem opcao "Missao"

---

## Detalhes tecnicos

### MissaoInstantaneaModal - campos e logica

| Campo | Componente | Obrigatorio |
|---|---|---|
| Motorista | Combobox (mesmo do MissaoModal) | Sim |
| Origem | Select (pontos de embarque) | Sim |
| Destino | Select (pontos de embarque) | Sim |

Ao submeter:
```typescript
onSave({
  motorista_id: motoristaId,
  titulo: `Missão: ${origem} → ${destino}`,
  ponto_embarque: origem,
  ponto_desembarque: destino,
  ponto_embarque_id: pontoOrigemId,
  ponto_desembarque_id: pontoDestinoId,
  prioridade: 'normal',
  qtd_pax: 0,
  data_programada: new Date().toISOString().slice(0, 10),
});
```

### AppOperador - integracao
O Operador atualmente nao tem criacao de missoes. Sera adicionado seguindo o mesmo padrao do Supervisor: usar `useMissoes` hook + `NewActionModal` para escolha de tipo + modais de missao.

