

# Permitir check-in sem veiculo + filtro de veiculo na missao

## Problema 1: Check-in bloqueado sem veiculo

O botao de check-in em `CheckinCheckoutCard.tsx` tem `disabled={!veiculoAtribuido}`, impedindo motoristas sem veiculo vinculado de fazer check-in. Isso contradiz a regra de negocio onde o check-in deve ser independente do veiculo.

## Problema 2: Aceite de missao sem validacao de veiculo

Quando o motorista aceita ou inicia uma missao, nao ha verificacao se ele tem um veiculo vinculado. O usuario quer:
- Missao pode ser designada a qualquer momento (sem filtro)
- Ao aceitar, se nao tiver veiculo, mostrar popup avisando para pedir ao supervisor
- Ao iniciar, tambem verificar veiculo

## Solucao

### 1. Check-in sem veiculo (CheckinCheckoutCard.tsx)

- Remover `!veiculoAtribuido` da condicao `disabled` do botao de check-in
- Quando NAO tem veiculo: pular o modal de vistoria (`VistoriaConfirmModal`) e fazer check-in direto
- Quando TEM veiculo: manter fluxo atual (vistoria -> confirmar -> check-in)
- Exibir estado "sem veiculo" com mensagem informativa mas sem bloquear

### 2. Filtro de veiculo na aceitacao de missao (AppMotorista.tsx)

- Na acao `aceitar`: verificar se motorista tem `veiculo_id`
  - Se SIM: aceitar normalmente
  - Se NAO: exibir dialog/popup informando "Solicite ao supervisor a vinculacao do veiculo antes de aceitar a missao"
- Na acao `iniciar`: mesma verificacao (seguranca extra)
  - Se NAO tem veiculo: bloquear e mostrar aviso

### 3. Componente de aviso (novo AlertDialog simples)

Popup simples usando AlertDialog do shadcn com:
- Icone de carro
- Titulo: "Veiculo nao vinculado"
- Mensagem: "Para aceitar esta missao, solicite ao supervisor operacional que vincule um veiculo ao seu perfil."
- Botao: "Entendi"

## Arquivos modificados

1. **Editar**: `src/components/app/CheckinCheckoutCard.tsx`
   - Remover `!veiculoAtribuido` do disabled
   - Condicional: sem veiculo faz checkin direto, com veiculo abre vistoria

2. **Editar**: `src/pages/app/AppMotorista.tsx`
   - Adicionar estado para modal de aviso de veiculo
   - No `handleMissaoAction('aceitar')`: verificar `motoristaData?.veiculo_id`
   - No `handleMissaoAction('iniciar')`: verificar `motoristaData?.veiculo_id`
   - Renderizar AlertDialog de aviso

## Fluxo esperado

```text
MOTORISTA FAZ CHECK-IN
  |-- Tem veiculo? -> Modal vistoria -> Confirma -> Check-in
  |-- Sem veiculo? -> Check-in direto (sem vistoria)
  
CCO DESIGNA MISSAO (qualquer momento, qualquer status)

MOTORISTA ACEITA MISSAO
  |-- Tem veiculo? -> Aceita normalmente
  |-- Sem veiculo? -> Popup "Peca ao supervisor vincular veiculo"

MOTORISTA INICIA MISSAO
  |-- Tem veiculo? -> Cria viagem, inicia
  |-- Sem veiculo? -> Popup "Peca ao supervisor vincular veiculo"
```

