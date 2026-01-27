
# Plano: Análise Completa do Sistema e Teste de Fluxo de Missões

## Resumo Executivo

Realizei uma auditoria completa do sistema analisando banco de dados, código, hooks, componentes e fluxos operacionais. Abaixo apresento os resultados organizados nas três áreas solicitadas.

---

## 1. Teste do Fluxo Completo de Missão

### Estado Atual das Missões

| Status | Quantidade | Observação |
|--------|------------|------------|
| Pendente | 2 | Aguardando aceite |
| Aceita | 2 | Aguardando início |
| Em Andamento | 0 | Nenhuma em execução |

**Missões Pendentes Identificadas:**
- "Teste" para Carina: SDU → Sheraton
- "Teste" para Claudio: Jockey → Sheraton

### Verificação do Código de Fluxo

O código em `AppMotorista.tsx` (linhas 195-252) foi corrigido e agora:
- Usa `getAgoraSync()` para timestamps sincronizados
- Atualiza `ultima_localizacao` para `ponto_desembarque` ao finalizar
- Registra `finalizado_por` na viagem

### Viagem Travada Identificada

**PROBLEMA ENCONTRADO:** Uma viagem está travada em "em_andamento" sem finalização:
- **ID:** a3915e71-20f6-4dec-84f5-70f0235a03ac
- **Motorista:** Teste
- **Rota:** Hilton Barra → SDU
- **Iniciada:** 26/01/2026 11:53
- **Status:** em_andamento (não encerrada)

Esta viagem precisa ser encerrada manualmente ou automaticamente via script de limpeza.

### Verificação de Localização no Painel

Drivers com localização atualizada corretamente:
- **Elaine:** Sheraton (após missão finalizada às 20:38)
- **Briefing Manhã:** Sheraton (após missão às 15:46)

Drivers sem localização (nunca finalizaram viagem ou são novos):
- Antonio, Bira, Carlos, Daniel, Edson, etc. (17 motoristas)

---

## 2. Inconsistências Encontradas

### 2.1 Dados Operacionais

| Categoria | Status | Detalhes |
|-----------|--------|----------|
| Viagens sem motorista_id | ⚠️ | ~260 viagens legadas (Google Sheets) sem FK |
| Motoristas sem localização | ✅ Esperado | 17 motoristas nunca finalizaram viagem |
| Missões órfãs | ✅ OK | Nenhuma encontrada |
| Motoristas duplicados | ✅ OK | Nenhum duplicado |

### 2.2 Roles e Permissões

**Estrutura de Roles:**
```
user_roles (global):
├── admin (4 usuários): Antonio, Nicolas, Douglas, Admin-AS
└── user (12 usuários): operadores e motoristas

profiles.user_type:
├── admin (4)
├── operador (11)
└── motorista (1 - Tatiana)

evento_usuarios (por evento):
└── role: motorista (11 registros)
```

**INCONSISTÊNCIA IDENTIFICADA:**
- Tatiana Suzarte tem `user_roles.role = 'admin'` mas `profiles.user_type = 'motorista'`
- Isso pode causar confusão na UI, embora funcionalmente ela tenha acesso admin

### 2.3 Credenciais de Motoristas

| Motorista | Telefone | Último Login |
|-----------|----------|--------------|
| Paulo Leandro | 21964178097 | Nunca |
| Elaine | 21983501606 | Nunca |
| Claudio | 21998407166 | Nunca |
| Carlos Henrique | 21990561952 | Nunca |
| Carina | 21966452933 | Nunca |

**OBSERVAÇÃO:** Nenhum motorista fez login pelo app ainda (todos com `ultimo_login = null`), apesar de terem credenciais criadas.

### 2.4 Pontos de Embarque

| Evento | Ponto Base | Outros Pontos |
|--------|------------|---------------|
| Rio Open - Briefing | Jockey ✅ | SDU, Sheraton |
| CCXP 2025 - teste | Nenhum ❌ | Hilton Barra, SDU |

**PROBLEMA:** Evento "CCXP 2025 - teste" não tem base configurada.

### 2.5 Check-ins de Presença

5 motoristas com check-in registrado, todos sem checkout:
- Elaine, Paulo Leandro, Briefing Manhã, Teste, Nicolas

Isso indica que a funcionalidade de checkout não está sendo usada ou há problema de UI.

---

## 3. Arquivos/Código/Tabelas Mortas

### 3.1 Hook Não Utilizado

| Arquivo | Status | Ação Recomendada |
|---------|--------|------------------|
| `src/hooks/useSwipeGesture.ts` | ⚠️ MORTO | Nenhum import encontrado. Pode ser removido. |

### 3.2 Tabela com Dados Vazios

| Tabela | Registros | Observação |
|--------|-----------|------------|
| `ponto_motoristas` | 0 | Feature de motorista preferencial por ponto não usada |
| `veiculo_vistoria_historico` | 0 | Nenhuma vistoria realizada ainda |
| `rotas_shuttle` | 2 | Rotas cadastradas mas sem uso aparente |

### 3.3 Código Potencialmente Redundante

| Arquivo | Observação |
|---------|------------|
| `useLocalizadorVeiculos.ts` | Usado apenas em 1 componente (LocalizadorVeiculoCard.tsx) |
| `useEventosMissoes.ts` | Hook específico, verificar se ainda necessário |

### 3.4 Viagens Legadas sem Foreign Keys

260+ viagens importadas do Google Sheets sem `motorista_id`:
- Motoristas: Nathan Queiroz, Assis, Mineiro, Eduardo, Odilon, etc.
- Essas viagens não podem ser rastreadas no sistema moderno

### 3.5 Cache/Estado

O sistema NÃO utiliza caches persistentes problemáticos:
- React Query gerencia cache de dados
- Supabase Realtime atualiza em tempo real
- Não há localStorage/sessionStorage para dados críticos

---

## Plano de Correções

### Correções Imediatas (Alta Prioridade)

1. **Encerrar viagem travada**
   - Executar UPDATE na viagem `a3915e71-...` para status='encerrado', encerrado=true

2. **Remover hook morto**
   - Deletar `src/hooks/useSwipeGesture.ts`

3. **Corrigir inconsistência de role**
   - Atualizar `profiles.user_type` de Tatiana para 'admin'

### Correções de Médio Prazo

4. **Configurar Base no CCXP**
   - Definir um ponto como `eh_base = true` para o evento CCXP 2025

5. **Limpar viagens legadas** (opcional)
   - Considerar migrar ou arquivar viagens sem `motorista_id`

### Verificações de Teste de Fluxo

Para testar o fluxo completo de missão:

1. **Designar**: Criar nova missão via CCO para motorista com credenciais
2. **Aceitar**: Motorista loga no app e aceita a missão (swipe direita)
3. **Iniciar**: Motorista inicia a missão (cria viagem automaticamente)
4. **Finalizar**: Motorista registra chegada
5. **Verificar**: Confirmar no Painel Localizador que motorista aparece no ponto de destino

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useSwipeGesture.ts` | DELETAR | Hook não utilizado |
| Migration SQL | CRIAR | Encerrar viagem travada e corrigir profile |

---

## Seção Técnica

### SQL para Correções Imediatas

```sql
-- 1. Encerrar viagem travada
UPDATE viagens
SET status = 'encerrado',
    encerrado = true,
    h_chegada = '15:00:00',
    h_fim_real = NOW()
WHERE id = 'a3915e71-20f6-4dec-84f5-70f0235a03ac';

-- 2. Corrigir motorista "Teste" - atualizar localização
UPDATE motoristas
SET status = 'disponivel',
    ultima_localizacao = 'SDU',
    ultima_localizacao_at = NOW()
WHERE id = '96cee90d-5b1d-4179-8c5e-6f1d9c3fb9c8';

-- 3. Corrigir inconsistência de profile (Tatiana)
UPDATE profiles
SET user_type = 'admin'
WHERE user_id = (SELECT user_id FROM profiles WHERE full_name = 'Tatiana Suzarte');

-- 4. Definir base para CCXP (escolher Hilton Barra como exemplo)
UPDATE pontos_embarque
SET eh_base = true
WHERE evento_id = '4a674005-5b4a-46c9-b010-12f867296602'
  AND nome = 'Hilton Barra';
```

### Verificação de Integridade

```sql
-- Verificar motoristas que deveriam ter localização
SELECT m.nome, m.ultima_localizacao, 
       (SELECT ponto_desembarque FROM viagens 
        WHERE motorista_id = m.id AND encerrado = true 
        ORDER BY h_fim_real DESC NULLS LAST LIMIT 1) as deveria_estar
FROM motoristas m
WHERE m.ativo = true;
```

---

## Resultado Esperado

Após as correções:

1. ✅ Viagem travada será encerrada
2. ✅ Motorista "Teste" terá localização correta (SDU)
3. ✅ Hook morto será removido do codebase
4. ✅ Profile de Tatiana terá user_type consistente
5. ✅ CCXP terá ponto base configurado
6. ✅ Fluxo de missões funcionará corretamente com atualização de localização
