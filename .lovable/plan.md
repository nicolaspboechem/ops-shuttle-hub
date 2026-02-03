
# Plano: Links de Navegação (Maps/Waze) para Rotas Shuttle

## Visão Geral

Adicionar campos de links de navegação (Google Maps e Waze) no cadastro de rotas shuttle, permitindo que motoristas e operadores abram diretamente os aplicativos de navegação para seguir a rota correta. Os links serão exibidos nos cards de viagem e missão nos apps mobile.

## Benefícios

- Motoristas saberão exatamente qual caminho seguir
- Redução de erros de rota
- Integração com apps de navegação que os motoristas já usam
- Compartilhamento fácil da rota com novos motoristas

## Fluxo de Uso

```text
Admin cadastra rota
       │
       ▼
┌─────────────────────────────┐
│ Adiciona links Maps/Waze   │
│ (cola links ou gera auto)  │
└─────────────────────────────┘
       │
       ▼
Viagem criada com essa rota
       │
       ▼
┌─────────────────────────────┐
│ Card da Viagem/Missão      │
│ exibe botões:              │
│                            │
│  🗺️ Maps   📍 Waze         │
│                            │
└─────────────────────────────┘
       │
       ▼
Motorista toca no botão
       │
       ▼
Abre app de navegação
```

---

## 1. Mudanças no Banco de Dados

Adicionar 3 novas colunas na tabela `rotas_shuttle`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `link_maps` | text | URL do Google Maps para a rota |
| `link_waze` | text | URL do Waze para a rota |
| `ponto_origem_id` | uuid (FK) | Referência ao ponto de embarque de origem |
| `ponto_destino_id` | uuid (FK) | Referência ao ponto de embarque de destino |

**Migration SQL:**
```sql
ALTER TABLE rotas_shuttle 
ADD COLUMN link_maps text,
ADD COLUMN link_waze text,
ADD COLUMN ponto_origem_id uuid REFERENCES pontos_embarque(id),
ADD COLUMN ponto_destino_id uuid REFERENCES pontos_embarque(id);
```

---

## 2. Modificações no Modal de Rota

Atualizar `RotaShuttleModal.tsx` para incluir:

- Seletor de Ponto de Origem (dropdown com pontos cadastrados)
- Seletor de Ponto de Destino (dropdown com pontos cadastrados)
- Campo para Link do Google Maps
- Campo para Link do Waze
- Botão "Gerar Link" que cria URLs automaticamente baseado nos endereços

### Geração Automática de Links

Se os pontos de embarque tiverem endereços cadastrados:

```typescript
// Google Maps - rota de A para B
const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;

// Waze - navegação para destino
const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`;
```

---

## 3. Exibição nos Cards de Viagem

Adicionar botões de navegação nos componentes:

- `ViagemCardMobile.tsx` (app motorista)
- `ViagemCardOperador.tsx` (app operador)
- `MissaoCardMobile.tsx` (missões)

### Design dos Botões

Linha adicional no card com dois botões:

```
┌─────────────────────────────────────┐
│ 🗺️ Abrir no Maps  │ 📍 Abrir no Waze│
└─────────────────────────────────────┘
```

Os botões só aparecem se a rota tiver os links configurados.

---

## 4. Componente Reutilizável

Criar `NavigationLinks.tsx`:

```typescript
interface NavigationLinksProps {
  linkMaps?: string | null;
  linkWaze?: string | null;
  origem?: string;
  destino?: string;
  compact?: boolean; // para exibição menor
}
```

Features:
- Abre links em nova aba/app nativo
- Fallback: se não tiver link mas tiver endereços, gera dinamicamente
- Ícones reconhecíveis (Google Maps, Waze)

---

## 5. Vinculação com Viagens

Quando uma viagem do tipo `shuttle` for criada:
- Buscar a rota shuttle correspondente pelo `ponto_embarque_id` e `ponto_destino_id`
- Copiar os links de navegação para a viagem (ou referenciar a rota)

Para viagens de `transfer`:
- Gerar links dinamicamente baseado nos pontos de embarque/desembarque

---

## Arquivos a Modificar/Criar

### Novos Arquivos
| Arquivo | Descrição |
|---------|-----------|
| `src/components/app/NavigationLinks.tsx` | Componente de botões Maps/Waze |

### Arquivos a Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useRotasShuttle.ts` | Adicionar campos link_maps, link_waze |
| `src/components/eventos/RotaShuttleModal.tsx` | Adicionar campos de link e seletores de ponto |
| `src/components/app/ViagemCardMobile.tsx` | Adicionar NavigationLinks |
| `src/components/app/ViagemCardOperador.tsx` | Adicionar NavigationLinks |
| `src/components/app/MissaoCardMobile.tsx` | Adicionar NavigationLinks |
| `src/integrations/supabase/types.ts` | Atualizar após migration |

---

## Seção Técnica

### Estrutura do NavigationLinks

```typescript
export function NavigationLinks({ 
  linkMaps, 
  linkWaze, 
  origem, 
  destino,
  compact = false 
}: NavigationLinksProps) {
  // Gerar links dinamicamente se não existirem mas tiver endereços
  const mapsUrl = linkMaps || (origem && destino 
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`
    : null
  );
  
  const wazeUrl = linkWaze || (destino
    ? `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`
    : null
  );

  if (!mapsUrl && !wazeUrl) return null;

  return (
    <div className={cn("flex gap-2", compact ? "pt-2" : "pt-3 border-t")}>
      {mapsUrl && (
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className="flex-1"
          onClick={() => window.open(mapsUrl, '_blank')}
        >
          <Map className="h-4 w-4 mr-2" />
          Maps
        </Button>
      )}
      {wazeUrl && (
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className="flex-1"
          onClick={() => window.open(wazeUrl, '_blank')}
        >
          <Navigation className="h-4 w-4 mr-2" />
          Waze
        </Button>
      )}
    </div>
  );
}
```

### Atualização do RotaShuttleModal

```typescript
// Novos campos no formulário
const [linkMaps, setLinkMaps] = useState('');
const [linkWaze, setLinkWaze] = useState('');
const [pontoOrigemId, setPontoOrigemId] = useState<string | null>(null);
const [pontoDestinoId, setPontoDestinoId] = useState<string | null>(null);

// Função para gerar links automaticamente
const gerarLinks = () => {
  const pontoOrigem = pontos.find(p => p.id === pontoOrigemId);
  const pontoDestino = pontos.find(p => p.id === pontoDestinoId);
  
  if (pontoOrigem?.endereco && pontoDestino?.endereco) {
    setLinkMaps(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pontoOrigem.endereco)}&destination=${encodeURIComponent(pontoDestino.endereco)}&travelmode=driving`);
    setLinkWaze(`https://waze.com/ul?q=${encodeURIComponent(pontoDestino.endereco)}&navigate=yes`);
    toast.success('Links gerados automaticamente');
  } else {
    toast.error('Cadastre endereços nos pontos para gerar links');
  }
};
```

### Interface Atualizada do RotaShuttleInput

```typescript
export interface RotaShuttleInput {
  nome: string;
  origem: string;
  destino: string;
  frequencia_minutos?: number | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
  // Novos campos
  link_maps?: string | null;
  link_waze?: string | null;
  ponto_origem_id?: string | null;
  ponto_destino_id?: string | null;
}
```

### SQL Migration Completa

```sql
-- Adicionar colunas de navegação na tabela rotas_shuttle
ALTER TABLE rotas_shuttle 
ADD COLUMN IF NOT EXISTS link_maps text,
ADD COLUMN IF NOT EXISTS link_waze text,
ADD COLUMN IF NOT EXISTS ponto_origem_id uuid REFERENCES pontos_embarque(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ponto_destino_id uuid REFERENCES pontos_embarque(id) ON DELETE SET NULL;

-- Índice para busca por pontos
CREATE INDEX IF NOT EXISTS idx_rotas_shuttle_pontos 
ON rotas_shuttle(ponto_origem_id, ponto_destino_id);
```
