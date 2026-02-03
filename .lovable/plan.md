
# Plano: Tutorial de Onboarding + Sistema de Suporte/FAQ para Todos os Papéis

## Visão Geral

Criar um sistema completo de onboarding e suporte para **todos os papéis** do sistema:
- **Admin (CCO)**: Tutorial no primeiro acesso + Central de Suporte expandida
- **Motorista**: Tutorial existente + aba de Ajuda com FAQ e contato
- **Operador**: Tutorial existente + aba de Ajuda com FAQ e contato
- **Supervisor**: Tutorial existente + aba de Ajuda com FAQ e contato
- **Cliente**: Tutorial existente + seção de Ajuda

## Estrutura da Solução

```text
┌────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE SUPORTE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Tutorial   │  │     FAQ      │  │   Contato    │         │
│  │  (1º acesso) │  │  (Por papel) │  │  (WhatsApp)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                 │                  │                 │
│         ▼                 ▼                  ▼                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                Componente: HelpDrawer                  │   │
│  │  - FAQ com perguntas frequentes por papel              │   │
│  │  - Guia rápido de ações                                │   │
│  │  - Escalação: "Se nada resolver, fale conosco"         │   │
│  │  - Botão WhatsApp para contato direto                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 1. Tutorial Admin (Novo)

Adicionar tutorial para administradores no primeiro acesso à página Home (CCO).

### Steps do Tutorial Admin:
1. **Bem-vindo ao CCO** - Visão geral do painel de controle
2. **Eventos** - Como criar e gerenciar eventos
3. **Dashboard** - Monitoramento em tempo real
4. **Equipe** - Cadastro de motoristas, veículos e membros
5. **Suporte** - Onde encontrar ajuda

---

## 2. Central de Ajuda/FAQ (Componente Reutilizável)

### HelpDrawer - Drawer lateral de ajuda

Um componente que pode ser usado em qualquer tela, com conteúdo adaptado por papel:

| Papel | Conteúdo do FAQ |
|-------|-----------------|
| **Admin** | Criar evento, cadastrar equipe, configurar módulos, gerar relatórios |
| **Motorista** | Check-in, aceitar missões, iniciar viagens, problemas comuns |
| **Operador** | Criar viagens, gerenciar status, cadastrar motoristas |
| **Supervisor** | Gerenciar frota, vincular veículos, localizar motoristas |
| **Cliente** | Visualizar dashboard, acompanhar operação |

### Estrutura do FAQ por Papel

**Motorista:**
- "Não consigo fazer check-in" → Verificar se módulo está ativo + veículo atribuído
- "Minha viagem não aparece" → Pull-to-refresh ou verificar status
- "Como cancelar uma viagem?" → Contatar operador
- "O app está travando" → Recarregar página

**Operador:**
- "Como criar uma viagem?" → Botão + na barra inferior
- "Motorista não aparece na lista" → Verificar se está cadastrado no evento
- "Como editar uma viagem?" → Deslizar card ou tocar para editar

**Supervisor:**
- "Como vincular veículo?" → Deslizar card do motorista
- "Motorista não aparece no localizador" → Check-in necessário
- "Como alterar localização?" → Deslizar e usar "Editar Local"

**Admin (CCO):**
- "Por que motoristas não conseguem check-in?" → Módulo de missões desativado
- "Evento não aparece no painel público" → Visibilidade desativada
- "Como resetar senha de motorista?" → Equipe > Motorista > Resetar
- "Relatórios não batem" → Verificar dia operacional

---

## 3. Escalação de Contato

Quando nenhuma opção do FAQ resolver:

```text
┌─────────────────────────────────────────────────┐
│  🆘 Ainda precisa de ajuda?                     │
│                                                 │
│  Se as opções acima não resolveram seu         │
│  problema, entre em contato diretamente:        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  💬 Falar com Suporte                   │   │
│  │     WhatsApp: (XX) XXXXX-XXXX           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Horário: 08:00 - 22:00 (todos os dias)        │
└─────────────────────────────────────────────────┘
```

---

## 4. Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/app/HelpDrawer.tsx` | Drawer de ajuda reutilizável com FAQ |
| `src/lib/data/faqData.ts` | Dados estruturados do FAQ por papel |
| `src/hooks/useTutorial.ts` | Adicionar `adminSteps` |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Home.tsx` | Adicionar tutorial no primeiro acesso |
| `src/components/app/OperadorMaisTab.tsx` | Adicionar botão de Ajuda/FAQ |
| `src/components/app/SupervisorMaisTab.tsx` | Adicionar botão de Ajuda/FAQ |
| `src/pages/app/AppMotorista.tsx` | Adicionar botão de ajuda no menu ou aba |
| `src/pages/app/AppCliente.tsx` | Adicionar acesso à ajuda |
| `src/pages/Suporte.tsx` | Expandir FAQ e adicionar seção de contato |

---

## 5. Fluxo de Ajuda

```text
Usuário com dúvida
       │
       ▼
┌─────────────────┐
│ Botão de Ajuda  │ ← Em todas as telas (ícone ?)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   HelpDrawer    │
│   (FAQ rápido)  │
└────────┬────────┘
         │
         ├── Problema resolvido? ✅ → Fecha drawer
         │
         ▼
┌─────────────────┐
│  Não resolveu?  │
│  ▼              │
│ Botão WhatsApp  │ ← Abre conversa direta
└─────────────────┘
```

---

## 6. Conteúdo do FAQ Expandido

### Para Admin (página Suporte.tsx)

**Seção: Problemas Comuns**
- Login de motorista não funciona → Verificar credenciais / Resetar senha
- Viagens não sincronizam → Verificar conexão / Recarregar
- Dados antigos aparecendo → Limpar cache do navegador
- Erro ao criar evento → Verificar campos obrigatórios

**Seção: Configurações Avançadas**
- Horário de virada do dia operacional
- Intervalo de atualização automática
- Configuração de alertas de atraso

**Seção: Relatórios e Auditoria**
- Como exportar dados
- Entendendo as métricas
- Histórico de presença

### Para Campo (Mobile)

FAQ simplificado e visual:

1. **Login/Acesso**
   - Esqueci minha senha
   - Meu login não funciona
   
2. **Operação**
   - Como fazer check-in
   - Como iniciar/finalizar viagem
   - Como aceitar/recusar missão

3. **Problemas Técnicos**
   - App não carrega
   - Dados não atualizam
   - Erro ao enviar informação

4. **Contato**
   - Falar com CCO
   - Falar com Suporte Técnico

---

## 7. Dados de Contato

O sistema usará uma variável de configuração para o contato de suporte:

```typescript
export const SUPPORT_CONFIG = {
  whatsappNumber: '5511999999999', // Número para contato
  supportHours: '08:00 - 22:00',
  supportEmail: 'suporte@asbrasil.com.br', // Opcional
};
```

---

## Seção Técnica

### Estrutura do FAQ (faqData.ts)

```typescript
interface FAQItem {
  question: string;
  answer: string;
  keywords: string[]; // Para busca
}

interface FAQSection {
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
}

type RoleFAQ = Record<TutorialRole | 'admin', FAQSection[]>;
```

### HelpDrawer Component

```typescript
interface HelpDrawerProps {
  role: 'admin' | 'motorista' | 'operador' | 'supervisor' | 'cliente';
  trigger?: ReactNode; // Botão customizado
}
```

### Admin Tutorial Steps

```typescript
export const adminSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao CCO! 🎛️',
    description: 'Este é o Centro de Controle Operacional. Aqui você gerencia todos os eventos e acompanha as operações em tempo real.',
    position: 'center',
  },
  {
    id: 'eventos',
    title: 'Eventos',
    description: 'No menu lateral, acesse "Eventos" para criar e gerenciar suas operações.',
    targetSelector: '[href="/eventos"]',
    position: 'right',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Dentro de cada evento, o Dashboard mostra métricas e atividades em tempo real.',
    targetSelector: '[data-tutorial="stats"]',
    position: 'bottom',
  },
  {
    id: 'suporte',
    title: 'Suporte',
    description: 'Precisa de ajuda? Acesse "Suporte" no menu para ver guias e FAQs completos.',
    targetSelector: '[href="/suporte"]',
    position: 'right',
  },
];
```

### Integração com Apps Mobile

Adicionar ícone de ajuda no header ou na aba "Mais":

```tsx
<Button variant="ghost" size="icon" onClick={() => setShowHelp(true)}>
  <HelpCircle className="h-5 w-5" />
</Button>

<HelpDrawer 
  open={showHelp} 
  onOpenChange={setShowHelp}
  role="motorista" 
/>
```
