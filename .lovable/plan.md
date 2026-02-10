
# Corrigir Exclusao de Veiculos Bloqueada por Foreign Keys

## Problema
O veiculo TESTE01 nao pode ser excluido porque 3 foreign keys usam `NO ACTION`, impedindo o DELETE quando ha registros filhos:

| Tabela | FK | Regra Atual | Registros |
|--------|----|-------------|-----------|
| motoristas | motoristas_veiculo_id_fkey | NO ACTION | 1 (Nicolas) |
| viagens | viagens_veiculo_id_fkey | NO ACTION | 2 viagens |
| motorista_presenca | motorista_presenca_veiculo_id_fkey | NO ACTION | possivelmente |

As tabelas `veiculo_fotos` e `veiculo_vistoria_historico` ja usam CASCADE, entao essas nao bloqueiam.

## Solucao

### 1. Migracao SQL - Alterar FKs para SET NULL

Trocar as 3 constraints de `NO ACTION` para `SET NULL`. Isso preserva o historico (viagens, presenca) mas desvincula o veiculo ao exclui-lo:

```sql
-- motoristas: desvincular veiculo ao excluir
ALTER TABLE public.motoristas
  DROP CONSTRAINT motoristas_veiculo_id_fkey,
  ADD CONSTRAINT motoristas_veiculo_id_fkey
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL;

-- viagens: manter historico, limpar referencia
ALTER TABLE public.viagens
  DROP CONSTRAINT viagens_veiculo_id_fkey,
  ADD CONSTRAINT viagens_veiculo_id_fkey
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL;

-- motorista_presenca: manter historico, limpar referencia
ALTER TABLE public.motorista_presenca
  DROP CONSTRAINT motorista_presenca_veiculo_id_fkey,
  ADD CONSTRAINT motorista_presenca_veiculo_id_fkey
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL;
```

### 2. Nenhuma mudanca no frontend

O codigo de exclusao em `useCadastros.ts` ja faz um simples `DELETE` -- com as FKs corrigidas, ele passara a funcionar sem alteracoes.

## Por que SET NULL e nao CASCADE

- CASCADE apagaria viagens e registros de presenca historicos, perdendo dados operacionais
- SET NULL apenas desvincula: o motorista Nicolas ficara sem veiculo vinculado, as viagens manterao todos os dados exceto a referencia ao veiculo

## Resultado

- Excluir TESTE01 (e qualquer outro veiculo) funcionara normalmente
- Historico de viagens e presenca sera preservado
- Motoristas vinculados serao automaticamente desvinculados
