

# Plano: Popup de Navegação ao Iniciar Viagem e Acesso no Menu

## Visão Geral

Quando o motorista iniciar uma viagem (qualquer tipo: Transfer, Shuttle ou Missão), exibir automaticamente um popup com os links para Google Maps e Waze. Além disso, adicionar uma opção permanente no menu "Mais" do app para acessar a navegação da viagem ativa.

## Fluxo de Uso

```text
Motorista inicia viagem
         │
         ▼
┌────────────────────────────────┐
│   Viagem Iniciada! 🚗         │
│                                │
│   Rota: Base → Hotel Central  │
│                                │
│  ┌──────────┐ ┌──────────┐    │
│  │  Maps    │ │  Waze    │    │
│  └──────────┘ └──────────┘    │
│                                │
│       [ Continuar ]            │
└────────────────────────────────┘
         │
         ▼
Motorista pode navegar ou fechar
         │
         ▼
A qualquer momento: Menu "Mais"
         │
         ▼
┌────────────────────────────────┐
│ 📍 Navegação da Viagem Ativa  │
│   Toque para abrir Maps/Waze  │
└────────────────────────────────┘
```

---

## 1. Novo Componente: NavigationModal

Modal/Dialog que aparece após iniciar viagem com:
- Título: "Viagem Iniciada!"
- Informação da rota (origem → destino)
- Botões Maps e Waze (grandes, touch-friendly)
- Botão "Continuar" para fechar

---

## 2. Integração no App Motorista

Modificar o fluxo de `handleAction` em `AppMotorista.tsx`:

1. Ao iniciar viagem com sucesso, abrir o NavigationModal
2. O modal recebe origem e destino da viagem
3. Motorista pode abrir navegação ou fechar

---

## 3. Opção "Navegação" no Menu "Mais"

Adicionar no menu "Mais" do app motorista:
- Item "Navegação da Viagem"
- Aparece apenas se houver viagem ativa (em_andamento)
- Ao tocar, abre o NavigationModal com a viagem atual

---

## 4. Replicar para App Operador

O mesmo comportamento no app do operador:
- Popup ao iniciar viagem
- Opção no menu "Mais" para acessar navegação

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/app/NavigationModal.tsx` | Modal com links Maps/Waze após iniciar viagem |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/AppMotorista.tsx` | Adicionar estado e lógica do modal + opção no menu Mais |
| `src/pages/app/AppOperador.tsx` | Adicionar estado e lógica do modal |
| `src/components/app/OperadorMaisTab.tsx` | Adicionar item de navegação |

---

## Seção Técnica

### Estrutura do NavigationModal

```typescript
interface NavigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origem?: string | null;
  destino?: string | null;
  title?: string;
}

export function NavigationModal({ 
  open, 
  onOpenChange, 
  origem, 
  destino,
  title = "Viagem Iniciada!"
}: NavigationModalProps) {
  // Gerar URLs dinamicamente
  const mapsUrl = origem && destino 
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`
    : null;
  
  const wazeUrl = destino
    ? `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {/* Rota */}
        <div className="space-y-2 py-4">
          {origem && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-600" />
              <span><strong>De:</strong> {origem}</span>
            </div>
          )}
          {destino && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-red-600" />
              <span><strong>Para:</strong> {destino}</span>
            </div>
          )}
        </div>

        {/* Botões de Navegação */}
        <div className="flex gap-3">
          {mapsUrl && (
            <Button 
              variant="outline" 
              className="flex-1 h-14 text-blue-600"
              onClick={() => window.open(mapsUrl, '_blank')}
            >
              <Map className="h-5 w-5 mr-2" />
              Google Maps
            </Button>
          )}
          {wazeUrl && (
            <Button 
              variant="outline" 
              className="flex-1 h-14 text-sky-600"
              onClick={() => window.open(wazeUrl, '_blank')}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Waze
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Integração no AppMotorista

```typescript
// Estado para o modal
const [navModalOpen, setNavModalOpen] = useState(false);
const [navModalData, setNavModalData] = useState<{origem?: string; destino?: string} | null>(null);

// Atualizar handleAction para abrir modal
const handleAction = async (viagemId: string, action: 'iniciar' | 'chegada') => {
  const viagem = viagens.find(v => v.id === viagemId);
  if (!viagem) return;

  setOperando(viagemId);
  try {
    if (action === 'iniciar') {
      const sucesso = await iniciarViagem(viagem);
      if (sucesso) {
        // Abrir modal de navegação
        setNavModalData({
          origem: viagem.ponto_embarque,
          destino: viagem.ponto_desembarque
        });
        setNavModalOpen(true);
      }
    }
    if (action === 'chegada') await registrarChegada(viagem);
    refetch();
  } finally {
    setOperando(null);
  }
};

// Similar para handleMissaoAction quando action === 'iniciar'
```

### Opção no Menu "Mais" (Motorista)

```typescript
// No case 'mais' do renderTabContent
const viagemAtiva = minhasViagensAtivas.find(v => v.status === 'em_andamento');

return (
  <div className="space-y-4">
    {/* Card de Navegação (só aparece com viagem ativa) */}
    {viagemAtiva && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            Navegação da Viagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Abrir rota no app de navegação
          </p>
          <Button 
            variant="outline" 
            className="w-full justify-between h-12"
            onClick={() => {
              setNavModalData({
                origem: viagemAtiva.ponto_embarque,
                destino: viagemAtiva.ponto_desembarque
              });
              setNavModalOpen(true);
            }}
          >
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-3" />
              Abrir Navegação
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>
    )}
    
    {/* ... resto do menu ... */}
  </div>
);
```

### Integração no AppOperador

Similar ao motorista:
1. Adicionar estado `navModalOpen` e `navModalData`
2. Modificar as ações de iniciar viagem nos cards
3. O operador inicia viagens via `ViagemCardOperador` que usa `useViagemOperacao`

