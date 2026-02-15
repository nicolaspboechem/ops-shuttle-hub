

# Mover Escala para Mapa de Servico + Mostrar Veiculo nos Cards

## Resumo

Duas alteracoes:
1. Remover a aba "Escala" da sidebar de Motoristas e adicionar na sidebar de Mapa de Servico
2. No card de motorista dentro da escala, mostrar o nome do veiculo vinculado (ao lado do badge "Ativo" ou abaixo do nome)

---

## Alteracoes

### 1. Remover "Escala" de Motoristas.tsx

- Linha 44: remover `{ id: 'escala', label: 'Escala', icon: Calendar }` do array `sections`
- Remover import do `Calendar` icon e do `MotoristasEscala`
- Remover o bloco de render condicional `activeSection === 'escala'` (linhas 1095-1101)

### 2. Adicionar "Escala" no MapaServico.tsx

- Adicionar `Calendar` ao import de lucide-react
- Adicionar import de `MotoristasEscala` e hooks necessarios (`useMotoristas` de `useCadastros`, `useEquipe`)
- Adicionar `{ id: 'escala', label: 'Escala', icon: Calendar }` ao array `sections` (linha 24-27)
- Instanciar `useMotoristas(eventoId)` e `useEquipe(eventoId)` no componente
- Criar funcao `getPresenca` igual a de Motoristas.tsx (buscar membro por tipo === 'motorista')
- Adicionar bloco de render para `activeSection === 'escala'` junto aos existentes (linhas 558-563)

### 3. Mostrar veiculo no MotoristaEscalaCard

No componente `MotoristaEscalaCard` dentro de `MotoristasEscala.tsx`:
- O tipo `Motorista` ja possui `veiculo?: Veiculo` com `nome` e `placa`
- Abaixo do nome do motorista, quando houver veiculo vinculado, mostrar uma linha com o nome/placa do veiculo em texto menor e cor mais suave
- Quando o status for "Ativo", mostrar o veiculo ao lado do badge

---

## Detalhes Tecnicos

### MapaServico.tsx - novos imports e dados

```text
import { useMotoristas } from '@/hooks/useCadastros';
import { useEquipe } from '@/hooks/useEquipe';
import { MotoristasEscala } from '@/components/motoristas/MotoristasEscala';
import { Calendar } from 'lucide-react';

// No array sections:
{ id: 'escala', label: 'Escala', icon: Calendar }

// Dentro do componente:
const { motoristas: motoristasCadastrados } = useMotoristas(eventoId);
const { membros: equipeMembros } = useEquipe(eventoId);

const getPresenca = (motoristaId: string) => {
  const membro = equipeMembros.find(m => m.tipo === 'motorista' && m.id === motoristaId);
  return membro ? { checkin_at: membro.checkin_at, checkout_at: membro.checkout_at } : null;
};

// Render:
<div className={activeSection === 'escala' ? 'flex flex-col h-full p-4' : 'hidden'}>
  <MotoristasEscala eventoId={eventoId || ''} motoristas={motoristasCadastrados} getPresenca={getPresenca} />
</div>
```

### MotoristaEscalaCard - mostrar veiculo

```text
<div className="flex-1 min-w-0">
  <p className="text-sm font-medium truncate">{motorista.nome}</p>
  {motorista.veiculo && (
    <p className="text-[10px] text-muted-foreground truncate">
      {motorista.veiculo.nome || motorista.veiculo.placa}
    </p>
  )}
</div>
```

---

## Arquivos alterados

| Arquivo | Acao |
|---------|------|
| `src/pages/Motoristas.tsx` | Remover secao "Escala" do sections, remover render e imports relacionados |
| `src/pages/MapaServico.tsx` | Adicionar secao "Escala", hooks de dados, e render do MotoristasEscala |
| `src/components/motoristas/MotoristasEscala.tsx` | Adicionar nome do veiculo no MotoristaEscalaCard |

