
# Plano: Melhorar Exibição de Avarias no App Motorista e Painel Admin

## Problema

1. **App Motorista (MotoristaVeiculoTab)**: As avarias aparecem apenas como tags simples com área e descrição, faltando informações cruciais:
   - Data e hora do registro
   - Quem registrou a avaria
   - Com quem estava o veículo no momento
   - Fotos da avaria

2. **Painel Admin (VeiculoDetalheModal)**: Na aba "Resumo" não há seção detalhada de avarias ativas - apenas uma contagem genérica.

## Solução

### 1. App Motorista - Melhorar Card de Avarias

Buscar o histórico de vistorias mais recente com avarias e exibir:

```text
┌────────────────────────────────────────────────────┐
│ ⚠️ Avarias Registradas                         (2) │
├────────────────────────────────────────────────────┤
│ 📍 Frente                                          │
│    Arranhão no para-choque dianteiro               │
│    ───────────────────────────────────             │
│    📅 04/02/2026 às 15:02                          │
│    👤 Registrado por: João Silva                   │
│    🚗 Veículo estava com: Nicolas                  │
│    📷 [Ver Foto]                                   │
├────────────────────────────────────────────────────┤
│ 📍 Lateral Direita                                 │
│    Amassado leve                                   │
│    ───────────────────────────────────             │
│    📅 03/02/2026 às 10:30                          │
│    👤 Registrado por: Coordenação                  │
│    🚗 Veículo estava com: Carlos                   │
└────────────────────────────────────────────────────┘
```

### 2. Painel Admin - Adicionar Seção de Avarias no Resumo

Na aba "Resumo" do `VeiculoDetalheModal`, adicionar uma seção que lista as avarias atuais do veículo com:
- Área afetada
- Descrição
- Data do registro
- Quem registrou
- Link para ver fotos

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/app/MotoristaVeiculoTab.tsx` | Buscar última vistoria com avarias e exibir detalhes completos |
| `src/components/veiculos/VeiculoDetalheModal.tsx` | Adicionar seção de avarias na aba Resumo |

---

## Seção Técnica

### 1. MotoristaVeiculoTab.tsx

**Adicionar busca do histórico de vistoria:**

```typescript
import { useVistoriaHistorico } from '@/hooks/useVistoriaHistorico';

// Dentro do componente:
const { data: vistoriasHistorico } = useVistoriaHistorico(veiculo?.id || null);

// Pegar a última vistoria que registrou as avarias atuais
const ultimaVistoriaComAvarias = useMemo(() => {
  if (!vistoriasHistorico || !veiculo?.possui_avarias) return null;
  return vistoriasHistorico.find(v => v.possui_avarias);
}, [vistoriasHistorico, veiculo?.possui_avarias]);
```

**Melhorar interface AreaInspecaoData para incluir fotos:**

```typescript
interface AvariaCompleta {
  area: string;
  descricao: string;
  fotos: string[];
  dataRegistro: string;
  registradoPor: string;
  motoristaEmUso: string | null;
}

// Extrair avarias com todos os dados
const getAvariasCompletas = (): AvariaCompleta[] => {
  if (!ultimaVistoriaComAvarias) {
    // Fallback para dados do veículo atual
    if (!veiculo?.inspecao_dados) return [];
    const dados = veiculo.inspecao_dados as InspecaoDados;
    if (!dados.areas) return [];
    return dados.areas
      .filter(a => a.possuiAvaria)
      .map(a => ({
        area: a.nome,
        descricao: a.descricao,
        fotos: a.fotos || [],
        dataRegistro: veiculo.inspecao_data || '',
        registradoPor: 'Sistema',
        motoristaEmUso: null
      }));
  }

  const dados = ultimaVistoriaComAvarias.inspecao_dados as InspecaoDados;
  if (!dados?.areas) return [];
  
  return dados.areas
    .filter(a => a.possuiAvaria)
    .map(a => ({
      area: a.nome,
      descricao: a.descricao,
      fotos: a.fotos || [],
      dataRegistro: ultimaVistoriaComAvarias.created_at,
      registradoPor: ultimaVistoriaComAvarias.realizado_por_nome || 
                     ultimaVistoriaComAvarias.profile?.full_name || 
                     'Sistema',
      motoristaEmUso: ultimaVistoriaComAvarias.motorista_nome
    }));
};
```

**Redesenhar o card de avarias com informações completas:**

```tsx
{avariasCompletas.map((avaria, index) => (
  <div key={index} className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
    {/* Área e descrição */}
    <div>
      <p className="text-sm font-semibold capitalize text-amber-700 dark:text-amber-400">
        {avaria.area}
      </p>
      <p className="text-sm text-muted-foreground">
        {avaria.descricao || 'Avaria registrada sem descrição'}
      </p>
    </div>
    
    <Separator className="bg-amber-500/20" />
    
    {/* Metadados */}
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {avaria.dataRegistro && (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>
            {format(parseISO(avaria.dataRegistro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <User className="h-3 w-3" />
        <span>Registrado por: <strong>{avaria.registradoPor}</strong></span>
      </div>
      {avaria.motoristaEmUso && (
        <div className="flex items-center gap-2">
          <Car className="h-3 w-3" />
          <span>Veículo estava com: <strong>{avaria.motoristaEmUso}</strong></span>
        </div>
      )}
    </div>
    
    {/* Fotos */}
    {avaria.fotos.length > 0 && (
      <div className="pt-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {avaria.fotos.map((foto, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPhoto(foto)}
              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-amber-500/30"
            >
              <img src={foto} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
))}
```

**Adicionar modal de visualização de foto ampliada:**

```tsx
const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

// No final do JSX:
{selectedPhoto && (
  <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
    <DialogContent className="max-w-3xl p-0">
      <img src={selectedPhoto} alt="Foto da avaria" className="w-full h-auto" />
    </DialogContent>
  </Dialog>
)}
```

### 2. VeiculoDetalheModal.tsx

**Adicionar seção de avarias ativas na aba Resumo:**

Após os cards de status/motorista/capacidade, adicionar:

```tsx
{/* Avarias Ativas */}
{veiculo.possui_avarias && (
  <div className="space-y-3">
    <h4 className="font-medium flex items-center gap-2 text-destructive">
      <AlertTriangle className="h-4 w-4" />
      Avarias Ativas
    </h4>
    
    {/* Buscar avarias do inspecao_dados atual */}
    {(() => {
      const dados = veiculo.inspecao_dados as any;
      const areasComAvaria = dados?.areas?.filter((a: any) => a.possuiAvaria) || [];
      
      return areasComAvaria.length > 0 ? (
        <div className="space-y-2">
          {areasComAvaria.map((area: any, idx: number) => (
            <div 
              key={idx}
              className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {area.nome}
                </Badge>
              </div>
              {area.descricao && (
                <p className="text-sm text-muted-foreground mt-2">{area.descricao}</p>
              )}
              {area.fotos?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {area.fotos.slice(0, 3).map((url: string, i: number) => (
                    <img 
                      key={i}
                      src={url} 
                      alt=""
                      className="w-12 h-12 rounded object-cover border"
                    />
                  ))}
                  {area.fotos.length > 3 && (
                    <span className="text-xs text-muted-foreground flex items-center">
                      +{area.fotos.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Veículo marcado com avarias, mas sem detalhes registrados.
        </p>
      );
    })()}
    
    {/* Mostrar data do registro */}
    {veiculo.inspecao_data && (
      <p className="text-xs text-muted-foreground">
        Registrado em {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </p>
    )}
  </div>
)}
```

---

## Resultado Esperado

### App Motorista
- Card de avarias completo com:
  - Data e hora exatas do registro
  - Nome de quem registrou a avaria
  - Nome do motorista que estava com o veículo no momento
  - Fotos clicáveis para visualização ampliada
  - Informações claras para o motorista saber exatamente o estado do veículo

### Painel Admin
- Aba "Resumo" do modal de veículo mostra avarias ativas com:
  - Lista de áreas afetadas
  - Descrição de cada avaria
  - Prévia das fotos
  - Data do registro
  
---

## Fluxo de Informação

```text
Vistoria registra avaria
       ↓
Dados salvos em:
- veiculos.inspecao_dados (estado atual)
- veiculos.possui_avarias = true
- veiculo_vistoria_historico (snapshot completo)
       ↓
App Motorista busca histórico → exibe detalhes completos
Painel Admin lê inspecao_dados → exibe na aba Resumo
```
