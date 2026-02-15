

# Escala de Motoristas - Nova Aba no CCO

## Objetivo

Criar um sistema de escalas de turnos na aba "Motoristas" do CCO, permitindo organizar motoristas por horario de trabalho (ex: 06:00-18:00 e 18:00-06:00), com visualizacao lado a lado e drag-and-drop entre escalas.

---

## Nova Tabela: `escalas`

Armazena as escalas criadas por evento.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| evento_id | uuid NOT NULL | FK para eventos |
| nome | varchar NOT NULL | Ex: "Turno Diurno" |
| horario_inicio | time NOT NULL | Ex: 06:00 |
| horario_fim | time NOT NULL | Ex: 18:00 |
| cor | varchar | Cor identificadora (opcional) |
| ativo | boolean DEFAULT true | Se a escala esta ativa |
| created_at | timestamptz DEFAULT now() | Criacao |
| criado_por | uuid | Quem criou |

## Nova Tabela: `escala_motoristas`

Vincula motoristas a escalas.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| escala_id | uuid NOT NULL | FK para escalas |
| motorista_id | uuid NOT NULL | FK para motoristas |
| created_at | timestamptz DEFAULT now() | Criacao |

Constraint UNIQUE em (escala_id, motorista_id).

---

## Alteracoes na Interface

### 1. Nova secao na InnerSidebar

No arquivo `src/pages/Motoristas.tsx`, adicionar uma terceira secao:

```text
const sections = [
  { id: 'cadastro', label: 'Motoristas', icon: Users },
  { id: 'escala', label: 'Escala', icon: Calendar },
  { id: 'auditoria', label: 'Auditoria', icon: FileBarChart },
];
```

### 2. Componente `MotoristasEscala` (novo arquivo)

`src/components/motoristas/MotoristasEscala.tsx`

Interface principal com:

- **Botao "Criar Escala"** no topo, que abre um wizard/dialog
- **Layout de duas colunas** usando `ResizablePanelGroup` (horizontal) com `ResizableHandle` arrastavel
  - Cada coluna mostra UMA escala selecionada (dropdown no topo de cada painel)
  - Dentro de cada painel: lista dos motoristas vinculados, com badge de status de check-in (verde = check-in ativo, cinza = sem check-in, vermelho = checkout feito)
- **Drag-and-drop** entre as duas colunas usando `@dnd-kit/core` (mesmo padrao do Kanban existente) para mover motoristas de uma escala para outra

### 3. Wizard "Criar Escala"

`src/components/motoristas/CreateEscalaWizard.tsx`

Dialog em 2 passos:

**Passo 1 - Dados da Escala:**
- Nome da escala (input texto)
- Horario de inicio (input time)
- Horario de fim (input time)

**Passo 2 - Selecionar Motoristas:**
- Lista de todos os motoristas do evento com checkboxes
- Busca por nome
- Badge indicando se o motorista ja pertence a outra escala
- Botao "Criar Escala"

### 4. Hook `useEscalas`

`src/hooks/useEscalas.ts`

Funcoes:
- `escalas` - lista de escalas do evento
- `escalaMotoristas` - motoristas por escala
- `createEscala(data)` - cria escala + vincula motoristas
- `updateEscala(id, data)` - atualiza
- `deleteEscala(id)` - remove
- `addMotoristaToEscala(escalaId, motoristaId)` - vincula
- `removeMotoristaFromEscala(escalaId, motoristaId)` - desvincula
- `moveMotorista(motoristaId, fromEscalaId, toEscalaId)` - move entre escalas (drag-and-drop)

### 5. Integracao com presenca

Cada card de motorista na escala mostra o status de check-in do dia atual, reutilizando a mesma logica de `getPresenca` ja existente na pagina de Motoristas.

---

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabelas `escalas` e `escala_motoristas` com RLS |
| `src/hooks/useEscalas.ts` | Novo hook para CRUD de escalas |
| `src/components/motoristas/MotoristasEscala.tsx` | Novo componente principal da aba |
| `src/components/motoristas/CreateEscalaWizard.tsx` | Novo wizard de criacao |
| `src/pages/Motoristas.tsx` | Adicionar secao "Escala" na sidebar e renderizar o componente |

## Resultado

- Operador cria quantas escalas precisar (ex: Turno A 06-18h, Turno B 18-06h)
- Visualiza duas escalas lado a lado com divisor arrastavel
- Arrasta motoristas entre escalas
- Ve status de check-in de cada motorista por escala
- Tudo sincronizado em tempo real via Supabase Realtime

