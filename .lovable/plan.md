

# Plano: Corrigir Exibição de Avarias no App Motorista + Histórico no CCO

## Problemas Identificados

### Problema 1: Parser de avarias incorreto no App Motorista

O código em `MotoristaVeiculoTab.tsx` e `VistoriaConfirmModal.tsx` usa uma estrutura de dados antiga/incorreta para buscar avarias.

**Estrutura REAL dos dados (verificada no banco):**
```json
{
  "areas": [
    { "id": "frente", "nome": "Frente", "possuiAvaria": true, "descricao": "Farol quebrado", "fotos": [...] },
    { "id": "lateral_esquerda", "nome": "Lateral Esquerda", "possuiAvaria": false, ... }
  ],
  "fotosGerais": [],
  "observacoes": ""
}
```

**Código ERRADO em MotoristaVeiculoTab:**
```typescript
const areaData = dados[area] as Record<string, unknown>;
if (areaData?.temAvaria && areaData?.descricao) { ... }
// Busca dados.frente.temAvaria - NÃO EXISTE!
```

**Código ERRADO em VistoriaConfirmModal:**
```typescript
const dados = veiculo.inspecao_dados as AreaInspecao[];
if (Array.isArray(dados)) { ... }
// Espera array no root - MAS É UM OBJETO COM .areas!
```

### Problema 2: Falta data/hora na exibição de avarias

Atualmente as avarias são mostradas sem indicação de quando foram registradas. O motorista precisa saber quando cada avaria foi documentada.

### Problema 3: Histórico no CCO não mostra quem registrou e com quem estava o veículo

Já existe `realizado_por_nome` e `motorista_nome` no banco, mas precisa verificar se está sendo salvo e exibido corretamente.

---

## Soluções

### 1. Corrigir parser de avarias em `MotoristaVeiculoTab.tsx`

Atualizar a função `getAvarias()` para usar a estrutura correta `dados.areas[]`:

```typescript
const getAvarias = (): { area: string; descricao: string }[] => {
  if (!veiculo?.inspecao_dados) return [];
  const dados = veiculo.inspecao_dados as { areas?: Array<{ id: string; nome: string; possuiAvaria: boolean; descricao: string; fotos: string[] }> };
  
  if (!dados.areas || !Array.isArray(dados.areas)) return [];
  
  return dados.areas
    .filter(a => a.possuiAvaria)
    .map(a => ({
      area: a.nome,
      descricao: a.descricao
    }));
};
```

### 2. Corrigir parser de avarias em `VistoriaConfirmModal.tsx`

Atualizar para buscar dentro de `dados.areas`:

```typescript
const getAvarias = (): AreaInspecao[] => {
  if (!veiculo?.inspecao_dados) return [];
  
  const dados = veiculo.inspecao_dados as { areas?: AreaInspecao[] };
  if (dados.areas && Array.isArray(dados.areas)) {
    return dados.areas.filter(area => area.possuiAvaria);
  }
  return [];
};
```

### 3. Adicionar data/hora na aba de veículo do motorista

Mostrar a data da última vistoria junto às avarias e incluir informação de quando foram registradas.

### 4. Verificar exibição no histórico do CCO

O `VistoriaHistoricoCard` já exibe `realizado_por_nome` e `motorista_nome`, mas precisamos garantir que o registro está sendo salvo corretamente.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/app/MotoristaVeiculoTab.tsx` | Corrigir parser de avarias + adicionar data/hora |
| `src/components/app/VistoriaConfirmModal.tsx` | Corrigir parser de avarias |

---

## Seção Técnica

### Código Corrigido - MotoristaVeiculoTab.tsx

```typescript
// Interface para tipagem correta
interface AreaInspecao {
  id: string;
  nome: string;
  possuiAvaria: boolean;
  descricao: string;
  fotos: string[];
}

interface InspecaoDados {
  areas?: AreaInspecao[];
  fotosGerais?: string[];
  observacoes?: string;
}

// Função getAvarias corrigida
const getAvarias = (): { area: string; descricao: string }[] => {
  if (!veiculo?.inspecao_dados) return [];
  
  const dados = veiculo.inspecao_dados as InspecaoDados;
  
  if (!dados.areas || !Array.isArray(dados.areas)) return [];
  
  return dados.areas
    .filter(a => a.possuiAvaria)
    .map(a => ({
      area: a.nome,
      descricao: a.descricao
    }));
};
```

### Código Corrigido - VistoriaConfirmModal.tsx

```typescript
interface InspecaoDados {
  areas?: AreaInspecao[];
  fotosGerais?: string[];
  observacoes?: string;
}

const getAvarias = (): AreaInspecao[] => {
  if (!veiculo?.inspecao_dados) return [];
  
  const dados = veiculo.inspecao_dados as InspecaoDados;
  
  if (dados.areas && Array.isArray(dados.areas)) {
    return dados.areas.filter(area => area.possuiAvaria);
  }
  return [];
};
```

### Exibição de Data na Seção de Avarias

Adicionar a data da última vistoria no card de avarias:

```tsx
{/* Card de Avarias com data */}
<Card className={veiculo.possui_avarias ? 'border-amber-500/30' : ''}>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-base">
        <AlertTriangle className={`h-4 w-4 ${veiculo.possui_avarias ? 'text-amber-500' : ''}`} />
        Avarias Registradas
      </CardTitle>
      {veiculo.possui_avarias && (
        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
          {avarias.length}
        </Badge>
      )}
    </div>
    {/* Mostrar data da última vistoria */}
    {veiculo.inspecao_data && (
      <p className="text-xs text-muted-foreground">
        Registrado em {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </p>
    )}
  </CardHeader>
  ...
</Card>
```

---

## Verificação do Histórico no CCO

O `VistoriaHistoricoCard` já mostra corretamente:
- **Quem registrou**: `realizado_por_nome` (linha 55, 155-159)
- **Motorista em uso**: `motorista_nome` (linhas 101-109)

Esses campos são salvos no `VistoriaVeiculoWizard.tsx` (linhas 206-209), então a funcionalidade já existe - só precisamos garantir que os parsers no app motorista estão corretos.

---

## Resultado Esperado

1. **Motorista verá avarias corretamente** na aba "Veículo" do app
2. **Modal de check-in mostrará avarias** para o motorista confirmar antes de assumir o veículo
3. **Data e hora** de quando as avarias foram registradas serão visíveis
4. **Histórico no CCO** continua mostrando quem registrou e com quem estava o veículo

