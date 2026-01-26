

# Plano: Permitir Visualização de Fotos do Veículo pelo Motorista

## Objetivo

Adicionar um botão de "Ver Fotos" no card de veículo do motorista (durante e após o check-in), permitindo que ele visualize as fotos principais do veículo a qualquer momento. Isso aumenta a segurança e permite comprovação de que o motorista verificou o estado do veículo.

---

## Situação Atual

- **VistoriaConfirmModal**: Já exibe fotos do veículo, mas **apenas durante o check-in**
- **CheckinCheckoutCard (durante expediente)**: Mostra apenas placa/nome do veículo, **sem acesso às fotos**
- **CheckinCheckoutCard (após checkout)**: Mostra veículo utilizado, **sem acesso às fotos**

---

## Solução

Criar um modal reutilizável para visualização de fotos do veículo (`VeiculoFotosModal`) e adicioná-lo aos cards de veículo.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────┐
│              AppMotorista                       │
│  ┌─────────────────────────────────────────┐    │
│  │         CheckinCheckoutCard             │    │
│  │  ┌───────────────────────────────────┐  │    │
│  │  │  Veículo em uso: ABC-1234         │  │    │
│  │  │                                   │  │    │
│  │  │  [📷 Ver Fotos] [ℹ️ Detalhes]     │◄──────── NOVO BOTÃO
│  │  └───────────────────────────────────┘  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │    VeiculoFotosModal (novo)             │◄────── NOVO MODAL
│  │  ┌───────────────────────────────────┐  │    │
│  │  │  🚗 Fotos do Veículo ABC-1234     │  │    │
│  │  │                                   │  │    │
│  │  │  [📷][📷][📷][📷]                 │  │    │
│  │  │  Frente | Lateral | Traseira      │  │    │
│  │  │                                   │  │    │
│  │  │  Avarias: Arranhão lateral esq.   │  │    │
│  │  │                                   │  │    │
│  │  │  ☑ Confirmo que vi as fotos       │  │    │
│  │  └───────────────────────────────────┘  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Criar Modal de Visualização de Fotos (NOVO)

**Arquivo:** `src/components/app/VeiculoFotosModal.tsx`

Modal dedicado para visualização de fotos do veículo com:
- Grid de fotos clicáveis (abre em nova aba)
- Informações de avarias do veículo
- Dados básicos (placa, tipo, combustível, KM)
- Última data de vistoria
- Checkbox opcional de confirmação de visualização

---

### 2. Atualizar CheckinCheckoutCard

**Arquivo:** `src/components/app/CheckinCheckoutCard.tsx`

Adicionar botão "Ver Fotos" em três locais:
- **Antes do check-in**: No card do veículo atribuído (já existe o modal de vistoria, mas adicionar botão extra)
- **Durante o expediente**: No card de "Veículo em uso"
- **Após check-out**: No card de "Veículo utilizado"

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/app/VeiculoFotosModal.tsx` | **CRIAR** | Modal de visualização de fotos do veículo |
| `src/components/app/CheckinCheckoutCard.tsx` | MODIFICAR | Adicionar botões "Ver Fotos" |

---

## Detalhes de Implementação

### VeiculoFotosModal - Novo Componente

```tsx
interface VeiculoFotosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  showConfirmation?: boolean; // Opcional: exibir checkbox de confirmação
  onConfirm?: () => void;     // Callback quando confirmar
}
```

**Funcionalidades:**
- Busca fotos da tabela `veiculo_fotos` ao abrir
- Exibe grid de fotos (3 colunas, clicáveis)
- Mostra avarias se existirem (parseia `inspecao_dados`)
- Exibe dados básicos do veículo
- Checkbox opcional para confirmação

---

### CheckinCheckoutCard - Modificações

**Estado DURANTE expediente (após check-in):**
```tsx
{veiculoExibir && (
  <div className="p-3 rounded-lg bg-background/80 border mb-4">
    <div className="flex items-center justify-between">
      {/* ... info do veículo ... */}
    </div>
    
    {/* NOVO: Botão Ver Fotos */}
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full mt-2"
      onClick={() => setShowFotosModal(true)}
    >
      <Camera className="h-4 w-4 mr-2" />
      Ver Fotos do Veículo
    </Button>
  </div>
)}

{/* NOVO: Modal de Fotos */}
<VeiculoFotosModal
  open={showFotosModal}
  onOpenChange={setShowFotosModal}
  veiculo={veiculoExibir}
/>
```

**Estado APÓS check-out:**
```tsx
{presenca?.veiculo && (
  <div className="p-3 rounded-lg bg-background/50 border mb-4">
    {/* ... info do veículo ... */}
    
    {/* NOVO: Botão Ver Fotos */}
    <Button 
      variant="ghost" 
      size="sm" 
      className="w-full mt-2"
      onClick={() => setShowFotosModal(true)}
    >
      <Camera className="h-4 w-4 mr-2" />
      Ver Fotos
    </Button>
  </div>
)}
```

---

## Fluxo de Uso

1. Motorista faz check-in (já vê fotos no VistoriaConfirmModal)
2. Durante o expediente, pode clicar em "Ver Fotos do Veículo" no card
3. Modal abre mostrando:
   - Fotos do veículo organizadas por área
   - Avarias registradas com descrições
   - Dados atuais do veículo (combustível, KM)
4. Motorista pode abrir foto em tela cheia clicando nela
5. Após check-out, ainda pode consultar fotos do veículo utilizado

---

## Benefícios

1. **Segurança**: Motorista pode comprovar que verificou o veículo
2. **Transparência**: Acesso às fotos a qualquer momento do expediente
3. **Documentação**: Registro visual do estado do veículo recebido
4. **Responsabilidade**: Motorista ciente das condições do veículo
5. **Reutilização**: Modal pode ser usado em outros contextos no futuro

