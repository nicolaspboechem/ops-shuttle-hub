

# Correcao: Viagens Iniciando Sozinhas no App do Motorista

## Diagnostico

Analisando os dados do banco, identifiquei **duas causas raiz**:

### Causa 1: Swipe acidental no celular
O card de missao tem uma acao de "swipe para direita" que inicia a missao **sem nenhuma confirmacao**. No celular, ao rolar a tela, o dedo pode fazer um movimento diagonal que o sistema interpreta como swipe horizontal. O limiar e de apenas 120 pixels -- muito baixo para mobile.

### Causa 2: Sem protecao contra cliques/swipes multiplos
O `handleMissaoAction` nao possui a trava `useRef` que ja foi adicionada nos formularios de criacao. Resultado concreto encontrado no banco:

- **Claudio Gomes da Silva**: 3 viagens duplicadas da mesma missao em 4 segundos (21:37:55, 21:37:57, 21:37:59)
- **Luis Claudio**: 2 viagens duplicadas (caso ja corrigido anteriormente mas sem protecao no codigo)

Todas as viagens tem `via: app_motorista_missao` -- ou seja, vieram do fluxo de missao no app.

---

## Correcoes

### 1. Adicionar confirmacao obrigatoria antes de iniciar missao

**Arquivo: `src/pages/app/AppMotorista.tsx`**

Adicionar um `AlertDialog` de confirmacao que aparece quando o motorista tenta iniciar uma missao (seja por botao ou swipe). O motorista devera confirmar com um toque explcito antes da viagem ser criada.

Novo fluxo:
```text
Swipe ou botao "Iniciar" -> Modal de confirmacao -> Confirmar -> Cria viagem
```

Novos estados:
```text
const [missaoParaIniciar, setMissaoParaIniciar] = useState<string | null>(null);
```

O `onIniciar` do MissaoCardMobile passara a abrir o dialog em vez de executar direto.

### 2. Adicionar trava anti-duplicata no handleMissaoAction

**Arquivo: `src/pages/app/AppMotorista.tsx`**

Adicionar `useRef(false)` como guard sincrono no `handleMissaoAction`, identico ao que ja foi feito no `CreateViagemMotoristaForm`:

```text
const missaoActionRef = useRef(false);

handleMissaoAction:
  1. if (missaoActionRef.current) return
  2. missaoActionRef.current = true
  3. ... executar logica ...
  4. finally: missaoActionRef.current = false
```

### 3. Verificar se missao ja tem viagem antes de criar outra

**Arquivo: `src/pages/app/AppMotorista.tsx`**

Antes de criar a viagem no `handleMissaoAction('iniciar')`, verificar no banco se ja existe uma viagem ativa para essa missao:

```text
const { data: viagemExistente } = await supabase
  .from('viagens')
  .select('id')
  .eq('origem_missao_id', missaoId)
  .in('status', ['agendado', 'em_andamento', 'aguardando_retorno'])
  .limit(1);

if (viagemExistente && viagemExistente.length > 0) {
  toast.info('Missao ja possui viagem ativa');
  return;
}
```

### 4. Aumentar limiar de swipe e adicionar confirmacao no swipe

**Arquivo: `src/components/app/SwipeableCard.tsx`**

- Aumentar `triggerThreshold` de 120px para 160px
- Manter o swipe mas agora ele abre o dialog de confirmacao (nao executa diretamente)

### 5. Limpeza de dados (migracao SQL)

Encerrar as viagens duplicadas do Claudio Gomes:

```sql
-- Encerrar 2 viagens duplicadas do Claudio (manter a primeira)
UPDATE viagens SET status = 'encerrado', encerrado = true,
  h_fim_real = NOW(),
  observacao = COALESCE(observacao || ' | ', '') || 'Encerrado - duplicata corrigida'
WHERE id IN (
  '156c07e9-5c03-45f1-99d1-ea24ced0d67d',
  '75a09966-1499-4bde-8a5d-18d201d0033a'
);
```

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/app/AppMotorista.tsx` | Dialog de confirmacao para iniciar missao + ref anti-duplicata + verificacao de viagem existente |
| `src/components/app/SwipeableCard.tsx` | Aumentar triggerThreshold de 120 para 160 |
| Migracao SQL | Encerrar duplicatas do Claudio Gomes |

