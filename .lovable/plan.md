

# Correcao: Motorista aparecendo em "Retornando para Base" antes de iniciar viagem

## Problema

No `MapaServico.tsx` (linha 134), o filtro `retornandoBaseIds` inclui missoes com status `pendente` e `aceita`:

```text
['pendente', 'aceita', 'em_andamento'].includes(missao.status)
```

Isso faz com que o motorista (Leonardo) seja movido para a coluna "Retornando para Base" assim que a missao e criada ou aceita, mesmo sem ter iniciado a viagem.

O `PainelLocalizador.tsx` (linha 220) ja esta correto, filtrando apenas por `em_andamento`.

## Correcao

Alterar a linha 134 de `MapaServico.tsx` para usar apenas `em_andamento`, alinhando com o comportamento do Painel Localizador:

```text
// ANTES (bug):
if (missao.ponto_desembarque === baseNome && ['pendente', 'aceita', 'em_andamento'].includes(missao.status))

// DEPOIS (correto):
if (missao.ponto_desembarque === baseNome && missao.status === 'em_andamento')
```

Tambem remover o bloco secundario (linhas 138-144) que move motoristas para "Retornando" baseado no `retornandoPontoNome` da localizacao. Esse bloco duplica motoristas na coluna mesmo quando nao estao em transito:

```text
// REMOVER:
if (retornandoPontoNome) {
  motoristas.forEach(m => {
    if (m.ultima_localizacao === retornandoPontoNome && m.status !== 'em_viagem') {
      ids.add(m.id);
    }
  });
}
```

## Resultado

- Motorista com missao `pendente` ou `aceita` permanece na sua coluna de localizacao atual
- Motorista so aparece em "Retornando para Base" quando a missao esta `em_andamento` (viagem iniciada)
- Comportamento alinhado com o Painel Localizador

## Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MapaServico.tsx` | `retornandoBaseIds`: filtrar apenas `em_andamento` + remover bloco duplicado de `retornandoPontoNome` |
