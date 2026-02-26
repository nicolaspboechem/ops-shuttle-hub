import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Target, ArrowRightLeft, Bus, Route } from 'lucide-react';

export type ActionType = 'missao' | 'deslocamento' | 'transfer' | 'shuttle';

interface NewActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tipo: ActionType) => void;
  /** Lista de tipos habilitados no evento. Se não informado, mostra todos (compatibilidade). */
  tiposHabilitados?: string[];
  /** @deprecated Use tiposHabilitados instead */
  hideShuttle?: boolean;
}

const actionItems: { tipo: ActionType; label: string; icon: React.ElementType; tipoEvento: string; borderClass: string; hoverClass: string; iconClass: string }[] = [
  {
    tipo: 'missao',
    label: 'Missão',
    icon: Target,
    tipoEvento: 'missao',
    borderClass: 'border-purple-200 dark:border-purple-800',
    hoverClass: 'hover:bg-purple-50 hover:border-purple-400 dark:hover:bg-purple-950',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  {
    tipo: 'deslocamento',
    label: 'Deslocamento',
    icon: Route,
    tipoEvento: 'missao', // deslocamento depende de missão estar habilitada
    borderClass: 'border-teal-200 dark:border-teal-800',
    hoverClass: 'hover:bg-teal-50 hover:border-teal-400 dark:hover:bg-teal-950',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
  {
    tipo: 'transfer',
    label: 'Transfer',
    icon: ArrowRightLeft,
    tipoEvento: 'transfer',
    borderClass: '',
    hoverClass: '',
    iconClass: 'text-primary',
  },
  {
    tipo: 'shuttle',
    label: 'Shuttle',
    icon: Bus,
    tipoEvento: 'shuttle',
    borderClass: '',
    hoverClass: '',
    iconClass: 'text-primary',
  },
];

export function NewActionModal({ open, onOpenChange, onSelect, tiposHabilitados, hideShuttle }: NewActionModalProps) {
  const handleSelect = (tipo: ActionType) => {
    onSelect(tipo);
    onOpenChange(false);
  };

  // Determinar quais itens mostrar
  const visibleItems = actionItems.filter(item => {
    if (tiposHabilitados && tiposHabilitados.length > 0) {
      return tiposHabilitados.includes(item.tipoEvento);
    }
    // Fallback: compatibilidade com hideShuttle
    if (hideShuttle && item.tipo === 'shuttle') return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Nova Operação</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          {visibleItems.map(item => {
            const Icon = item.icon;
            return (
              <Button
                key={item.tipo}
                variant="outline"
                className={`h-14 justify-start gap-3 text-base ${item.borderClass} ${item.hoverClass}`}
                onClick={() => handleSelect(item.tipo)}
              >
                <Icon className={`h-5 w-5 ${item.iconClass}`} />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
