
# Plano: Remover Viagens Ativas do App Motorista

## Problema

Quando o motorista aceita e inicia uma missão, aparecem **dois cards**:
1. Card da Missão com botão "Finalizar Missão" ✅
2. Card de Viagem Ativa com botão "CHEGOU" ❌

O botão "CHEGOU" é funcionalidade de **coordenador/operador/admin/supervisor** para registrar chegada e retorno do veículo. Motoristas não devem ver viagens ativas - isso gera confusão e duplicidade.

---

## Solução

Remover a seção "Viagens Ativas" do app do motorista completamente. O motorista trabalhará apenas com:
- **Missões designadas** → Aceitar → Iniciar → Finalizar
- **Criar viagem manual** (aba "Corrida") se necessário

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/AppMotorista.tsx` | Remover seção "Viagens Ativas" da aba "Início" |

---

## Seção Técnica

### Mudanças no AppMotorista.tsx

**Remover as seguintes linhas (360-377):**

```typescript
{/* Viagens Ativas */}
{minhasViagensAtivas.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium">
      <Car className="h-4 w-4 text-primary" />
      <span>Viagens Ativas ({minhasViagensAtivas.length})</span>
    </div>
    {minhasViagensAtivas.map(viagem => (
      <ViagemCardMobile
        key={viagem.id}
        viagem={viagem}
        loading={operando === viagem.id}
        onIniciar={() => handleAction(viagem.id, 'iniciar')}
        onChegada={() => handleAction(viagem.id, 'chegada')}
      />
    ))}
  </div>
)}
```

**Ajustar também:**

1. **Variável `hasContent`** (linha 300): Remover referência a viagens ativas
   - De: `minhasMissoes.length > 0 || minhasViagensAtivas.length > 0`
   - Para: `minhasMissoes.length > 0`

2. **Remover imports não utilizados** (se necessário): `ViagemCardMobile`

3. **Manter `minhasViagensAtivas`** apenas para:
   - A aba "Mais" onde exibe navegação da viagem em andamento (linhas 431-467)
   - Isso é útil porque o motorista pode querer reabrir a navegação

---

## Fluxo Correto (Após Correção)

```text
MOTORISTA recebe Missão → Aceitar → Iniciar → Finalizar Missão
                                    ↓
                             (viagem é criada automaticamente)
                             (mas NÃO aparece como card separado)
```

**Coordenador/Operador** pode ver a viagem no seu respectivo app e usar "CHEGOU" para registrar.

---

## Resultado Esperado

1. App do Motorista mostra **apenas Missões Designadas** na aba Início
2. Sem duplicidade de cards ou botões
3. Navegação da viagem ativa continua acessível na aba "Mais"
4. Coordenadores/Operadores/Admins mantêm acesso total às viagens ativas
