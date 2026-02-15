

# Correcoes: Sidebar Fixa e Exibir Quem Vinculou o Veiculo

## Problema 1: Sidebar Interna Expandindo Verticalmente

A `InnerSidebar` esta dentro de um `flex` container sem altura fixa, fazendo com que ela cresça junto com o conteudo da pagina. Deve ter altura fixa na viewport e ficar "sticky".

### Correcao

**Arquivo:** `src/components/layout/InnerSidebar.tsx`

Adicionar `sticky top-0 h-screen` ao `<aside>`, para que fique fixa na tela independente do scroll do conteudo.

**Arquivo:** `src/pages/Motoristas.tsx` (linha 1083)

O container `flex` que envolve InnerSidebar + conteudo nao precisa de mudanca, mas o conteudo ao lado precisa de `overflow-auto` (ja tem).

---

## Problema 2: Mostrar Quem Vinculou o Veiculo

Atualmente a exibicao do historico de vinculacao mostra apenas:

```
Evandro Marin
Vinculou TCG7I27 "22 - TRACKER PRETA" as 05:17
```

O nome exibido e o do **motorista**, mas falta o nome de **quem executou** a vinculacao. A tabela `veiculo_vistoria_historico` ja tem os campos `realizado_por` (UUID) e `realizado_por_nome` (varchar) que armazenam essa informacao.

### Correcao em 3 locais:

**1. `EscalasAuditoria.tsx`** - Auditoria de Escalas

Na query `fetchVeiculoHistorico`, adicionar `realizado_por_nome` ao SELECT:
```
.select('id, motorista_id, veiculo_id, tipo_vistoria, created_at, realizado_por_nome')
```

Na exibicao (linhas 442-453), mudar de:
```
Vinculou TCG7I27 as 05:17
```
Para:
```
[Nome de quem vinculou] vinculou TCG7I27 as 05:17
```

**2. `MotoristaViagensModal.tsx`** - Aba Veiculos (historico de vinculacao)

Na query de `veiculo_vistoria_historico` (linha 187), adicionar `realizado_por_nome`:
```
.select('id, tipo_vistoria, created_at, veiculo_id, realizado_por_nome, veiculos(placa, nome, tipo_veiculo)')
```

Na interface `VeiculoHistoricoItem`, adicionar campo `realizado_por_nome`.

Na interface `VeiculoIntervalo`, adicionar `vinculadoPor` e `desvinculadoPor`.

Na funcao `buildIntervalos`, propagar o `realizado_por_nome` para os intervalos.

Na aba Veiculos (linhas 437-448), exibir:
```
Vinculado por [nome]: dd/MM HH:mm
Desvinculado por [nome]: dd/MM HH:mm
```

**3. `MotoristaViagensModal.tsx`** - Aba Escalas (veiculos durante escala)

Na exibicao dos veiculos vinculados durante cada escala (linhas 391-399), incluir quem vinculou:
```
Van TYJ0H74 "Apelido" | por [nome] | 08:30 - 14:20
```

---

## Arquivos Alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/layout/InnerSidebar.tsx` | Adicionar `sticky top-0 h-screen` ao aside |
| `src/components/motoristas/EscalasAuditoria.tsx` | Buscar e exibir `realizado_por_nome` no historico de vinculacao |
| `src/components/motoristas/MotoristaViagensModal.tsx` | Buscar e exibir `realizado_por_nome` nas abas Escalas e Veiculos |

Nenhuma migracao de banco necessaria - o campo `realizado_por_nome` ja existe na tabela.
