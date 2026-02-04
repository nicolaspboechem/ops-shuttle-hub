
# Plano: Corrigir Exibição de Vistorias e Avarias no Painel Admin

## Diagnóstico

Após análise do código e banco de dados, identifiquei os seguintes problemas:

### 1. Tabela de histórico vazia
A tabela `veiculo_vistoria_historico` está vazia, mesmo tendo veículos com vistorias realizadas. Isso significa que:
- Veículos criados por importação não têm histórico de vistoria
- O wizard de vistoria pode não estar sendo chamado corretamente

### 2. Dados de vistoria existem, mas não são exibidos
O veículo "TESTE01" tem dados completos em `inspecao_dados`:
- Avarias registradas (frente com avaria)
- Fotos tiradas
- `inspecao_por` e `inspecao_data` preenchidos

Porém, essas informações **não aparecem** de forma clara no painel admin:
- Não mostra **quem** fez a vistoria
- Não mostra **quando** foi feita
- Não mostra **detalhes das avarias** (apenas o badge "Avarias")
- Não mostra **quem estava usando** o veículo na hora

---

## Solução

### Parte 1: Adicionar informações de vistoria nos cards do Kanban e Lista

Mostrar no card do veículo:
- Data/hora da última inspeção
- Nome de quem realizou a vistoria (resolver `inspecao_por` → `profiles.full_name`)
- Detalhes das avarias ao clicar

### Parte 2: Criar migração para popular histórico retroativamente

Criar um registro na tabela `veiculo_vistoria_historico` para cada veículo que já tem `inspecao_dados` preenchido, garantindo que o histórico fique completo.

### Parte 3: Melhorar exibição no VeiculoDetalheModal

Adicionar seção clara de "Última Vistoria" mostrando:
- Data e hora
- Quem realizou
- Motorista em uso (se houver)
- Resumo das avarias com fotos

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCadastros.ts` | Buscar dados de `profiles` para `inspecao_por` e `liberado_por` |
| `src/components/veiculos/VeiculoKanbanCardFull.tsx` | Adicionar exibição de data/hora da inspeção e quem fez |
| `src/components/veiculos/VeiculosListView.tsx` | Adicionar colunas para última inspeção e inspetor |
| `src/components/veiculos/VeiculoDetalheModal.tsx` | Melhorar seção de avarias com informações de quem fez |
| Migração SQL | Popular `veiculo_vistoria_historico` com dados existentes |

---

## Seção Técnica

### 1. Modificar Hook useCadastros (useVeiculos)

Adicionar join com `profiles` para resolver nomes:

```typescript
const { data, error } = await supabase
  .from('veiculos')
  .select(`
    *,
    inspecao_perfil:profiles!inspecao_por(full_name),
    liberado_perfil:profiles!liberado_por(full_name)
  `)
  .eq('evento_id', eventoId)
  .order('data_criacao', { ascending: false });
```

### 2. Exibir no Card do Veículo

Adicionar ao `VeiculoKanbanCardFull`:

```tsx
{/* Última Inspeção */}
{veiculo.inspecao_data && (
  <div className="text-xs text-muted-foreground">
    <ClipboardCheck className="h-3 w-3 inline mr-1" />
    Inspeção: {format(parseISO(veiculo.inspecao_data), "dd/MM HH:mm")}
    {veiculo.inspecao_perfil?.full_name && (
      <span> por {veiculo.inspecao_perfil.full_name}</span>
    )}
  </div>
)}
```

### 3. Detalhes das Avarias no Modal

No `VeiculoDetalheModal`, melhorar a seção de avarias:

```tsx
{/* Avarias Ativas - com mais detalhes */}
{veiculo.possui_avarias && (
  <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
    <h4 className="font-medium flex items-center gap-2 text-destructive">
      <AlertTriangle className="h-4 w-4" />
      Avarias Ativas
    </h4>
    
    {/* Mostrar data e quem registrou */}
    {veiculo.inspecao_data && (
      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Calendar className="h-3 w-3" />
        Registrado em {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm")}
        {veiculo.inspecao_perfil?.full_name && (
          <span>por <strong>{veiculo.inspecao_perfil.full_name}</strong></span>
        )}
      </p>
    )}
    
    {/* Lista de avarias com fotos */}
    {areasComAvaria.map((area) => (
      <div key={area.id} className="p-3 rounded bg-background border border-destructive/20">
        <Badge variant="destructive">{area.nome}</Badge>
        <p className="text-sm mt-1">{area.descricao}</p>
        {area.fotos?.length > 0 && (
          <div className="flex gap-2 mt-2">
            {area.fotos.map((url, i) => (
              <img key={i} src={url} className="w-12 h-12 rounded object-cover" />
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

### 4. Migração para Popular Histórico

Criar migração SQL para copiar dados existentes para o histórico:

```sql
-- Popular veiculo_vistoria_historico com dados existentes de veiculos
INSERT INTO veiculo_vistoria_historico (
  veiculo_id,
  evento_id,
  tipo_vistoria,
  status_anterior,
  status_novo,
  possui_avarias,
  inspecao_dados,
  nivel_combustivel,
  km_registrado,
  realizado_por,
  created_at
)
SELECT 
  id as veiculo_id,
  evento_id,
  'inspecao' as tipo_vistoria,
  NULL as status_anterior,
  COALESCE(status, 'em_inspecao') as status_novo,
  COALESCE(possui_avarias, false),
  inspecao_dados,
  nivel_combustivel,
  km_inicial as km_registrado,
  inspecao_por as realizado_por,
  COALESCE(inspecao_data, data_criacao) as created_at
FROM veiculos
WHERE inspecao_dados IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM veiculo_vistoria_historico vh 
  WHERE vh.veiculo_id = veiculos.id
);
```

### 5. Adicionar Coluna na Lista de Veículos

No `VeiculosListView`, adicionar colunas:

| Coluna | Dados |
|--------|-------|
| Última Inspeção | `inspecao_data` formatada |
| Inspetor | Nome via join com `profiles` |
| Status | Badge com avarias |

---

## Interface Esperada

### Card do Veículo (Kanban)
```
┌─────────────────────────────────────┐
│ 🚐 Van              [•••]           │
│ TESTE01                             │
│ ┌───────────────────────────────┐   │
│ │ ✓ Liberado │ 🔥 Cheio │ ⚠ Avarias │
│ └───────────────────────────────┘   │
│ 📋 Inspeção: 04/02 15:02 por João   │
│ ⚠ 1 avaria registrada               │
└─────────────────────────────────────┘
```

### Modal de Detalhes - Aba Resumo
```
┌─────────────────────────────────────────┐
│ 🚐 TESTE01 (Van)                        │
├─────────────────────────────────────────┤
│ AVARIAS ATIVAS                          │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Frente                            │ │
│ │ Descrição: TESTE 01                 │ │
│ │ [foto] [foto]                       │ │
│ │                                     │ │
│ │ 📅 Registrado em 04/02/2026 15:02   │ │
│ │ 👤 Por: João Silva                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Cards de veículos mostram data/hora da última inspeção e quem fez
2. Badge de avarias é clicável para ver detalhes
3. Modal mostra informações completas: avarias, fotos, inspetor, data
4. Histórico de vistorias é preenchido retroativamente
5. Aba "Vistorias" no modal mostra timeline completa
