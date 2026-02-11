

# Notificacao de veiculo vinculado + garantia do fluxo completo

## Contexto

O fluxo atual ja permite check-in sem veiculo e bloqueia aceite de missao sem veiculo. Porem, quando o supervisor vincula um veiculo ao motorista, o app do motorista nao detecta em tempo real -- precisa esperar o polling de 30s ou pull-to-refresh.

## O que sera feito

### 1. Realtime no registro do motorista (useMotoristaPresenca.ts)

Adicionar subscription na tabela `motoristas` filtrada pelo `motorista_id` para detectar mudancas no campo `veiculo_id` em tempo real. Quando detectar que `veiculo_id` mudou de null para um valor, disparar refetch automatico.

### 2. Banner de "Veiculo vinculado" no app (AppMotorista.tsx)

Adicionar logica para detectar quando `veiculoAtribuido` muda de `null` para um veiculo valido:
- Exibir um toast/sonner: "Veiculo vinculado! Verifique os detalhes na aba Veiculo."
- Isso orienta o motorista a conferir o veiculo antes de aceitar missoes

### 3. Atualizar versao (version.ts)

Incrementar para `1.2.1` com build date atualizada, refletindo:
- Check-in independente de veiculo
- Filtro de veiculo na aceitacao de missao
- Notificacao realtime de vinculacao de veiculo

## Fluxo completo garantido

```text
1. MOTORISTA FAZ LOGIN (/login/motorista)
2. MOTORISTA FAZ CHECK-IN
   |-- Tem veiculo? -> Modal vistoria -> Confirma -> Check-in
   |-- Sem veiculo? -> Check-in direto -> Status "Disponivel" no Localizador
3. SUPERVISOR VINCULA VEICULO (pelo app supervisor ou CCO)
   |-- App detecta via Realtime -> Toast "Veiculo vinculado!"
   |-- veiculoAtribuido atualiza automaticamente
4. CCO DESIGNA MISSAO (qualquer momento)
5. MOTORISTA ACEITA MISSAO
   |-- Tem veiculo? -> Aceita normalmente
   |-- Sem veiculo? -> Popup "Peca ao supervisor vincular veiculo"
6. MOTORISTA INICIA MISSAO -> Fluxo normal de viagem
```

## Arquivos modificados

1. **Editar**: `src/hooks/useMotoristaPresenca.ts` - Adicionar realtime subscription na tabela `motoristas` para detectar vinculacao de veiculo
2. **Editar**: `src/pages/app/AppMotorista.tsx` - Adicionar useEffect para detectar mudanca em `veiculoAtribuido` e exibir toast
3. **Editar**: `src/lib/version.ts` - Atualizar para 1.2.1

## Detalhes tecnicos

**useMotoristaPresenca.ts**: Adicionar segundo canal Realtime ouvindo `motoristas` com filtro `id=eq.{motoristaId}`. No callback, chamar `fetchPresenca()` que ja busca `veiculo_id` e atualiza `veiculoAtribuido`.

**AppMotorista.tsx**: useEffect com `useRef` para comparar valor anterior de `veiculoAtribuido`. Quando transicionar de `null` para um objeto valido, chamar `toast.success('Veiculo vinculado! Confira na aba Veiculo.')`.
