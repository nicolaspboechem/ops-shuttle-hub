
# Plano: Corrigir Exclusão de Motoristas que Trava

## Problema Identificado

A exclusão de motoristas está falhando silenciosamente quando:
1. O motorista está **vinculado a um veículo** (`veiculos.motorista_id`)
2. O motorista tem **registros em vistoria de veículos** (`veiculo_vistoria_historico.motorista_id`)

Ambas as tabelas têm constraints de FK com `ON DELETE NO ACTION`, o que **bloqueia** a deleção do motorista enquanto existirem registros relacionados.

## Tabelas e Constraints Atuais

| Tabela | Comportamento Atual | Status |
|--------|---------------------|--------|
| `motorista_credenciais` | ON DELETE CASCADE | OK |
| `motorista_presenca` | ON DELETE CASCADE | OK |
| `missoes` | ON DELETE CASCADE | OK |
| `ponto_motoristas` | ON DELETE CASCADE | OK |
| `veiculos` | ON DELETE NO ACTION | BLOQUEANTE |
| `veiculo_vistoria_historico` | ON DELETE NO ACTION | BLOQUEANTE |
| `viagens` | ON DELETE NO ACTION | Precisa tratar |

## Solução

Atualizar a Edge Function `delete-user` para:
1. **Desvincular veículos** (SET motorista_id = NULL) antes de deletar
2. **Limpar referência nas vistorias** (SET motorista_id = NULL) 
3. **Limpar referência nas viagens** (SET motorista_id = NULL)
4. Adicionar logs para debug

Isso preserva o histórico (viagens, vistorias) mas remove a referência ao motorista deletado.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/delete-user/index.ts` | Adicionar limpeza de veículos, vistorias e viagens |

---

## Seção Técnica

### Código Atualizado da Edge Function

```typescript
// ANTES de deletar o motorista, precisamos:

// 1. Desvincular veículos (SET NULL)
const { error: veiculoError } = await supabaseAdmin
  .from('veiculos')
  .update({ motorista_id: null })
  .eq('motorista_id', motorista_id);

if (veiculoError) {
  console.log('Error unlinking veiculos:', veiculoError.message);
}

// 2. Limpar referência nas vistorias (manter histórico, só remove FK)
const { error: vistoriaError } = await supabaseAdmin
  .from('veiculo_vistoria_historico')
  .update({ motorista_id: null })
  .eq('motorista_id', motorista_id);

if (vistoriaError) {
  console.log('Error unlinking vistorias:', vistoriaError.message);
}

// 3. Limpar referência nas viagens (manter histórico, só remove FK)
const { error: viagemError } = await supabaseAdmin
  .from('viagens')
  .update({ motorista_id: null })
  .eq('motorista_id', motorista_id);

if (viagemError) {
  console.log('Error unlinking viagens:', viagemError.message);
}

// Depois continuar com as deleções existentes...
```

### Ordem de Operações

```text
1. Desvincular veículos
2. Limpar FK em vistorias  
3. Limpar FK em viagens
4. Deletar motorista_credenciais (CASCADE automático)
5. Deletar motorista_presenca (CASCADE automático)
6. Deletar motorista (missoes e ponto_motoristas fazem CASCADE)
```

### Validação

Após a correção, ao excluir um motorista:
- Veículos ficam sem motorista vinculado (status disponível para novo vínculo)
- Histórico de viagens permanece (com motorista_id NULL, mas campo `motorista` texto preservado)
- Histórico de vistorias permanece (com `motorista_nome` texto preservado)
