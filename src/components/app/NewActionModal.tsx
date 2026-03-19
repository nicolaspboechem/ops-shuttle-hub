import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Target, Bus, Route, Zap, ListChecks, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActionType = 'missao' | 'missao_agendada' | 'deslocamento' | 'shuttle_rapido' | 'shuttle_completo';

interface NewActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tipo: ActionType) => void;
  tiposHabilitados?: string[];
}

interface GroupConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  tipoEvento: string;
  borderClass: string;
  hoverClass: string;
  iconClass: string;
  expandedBg: string;
  subItems?: { tipo: ActionType; label: string; sublabel: string; icon: React.ElementType }[];
  directAction?: ActionType;
}

const groups: GroupConfig[] = [
  {
    id: 'missao',
    label: 'Missão',
    icon: Target,
    tipoEvento: 'missao',
    borderClass: 'border-purple-200 dark:border-purple-800',
    hoverClass: 'hover:bg-purple-50 hover:border-purple-400 dark:hover:bg-purple-950',
    iconClass: 'text-purple-600 dark:text-purple-400',
    expandedBg: 'bg-purple-50/50 dark:bg-purple-950/30',
    subItems: [
      { tipo: 'missao', label: 'Instantânea', sublabel: 'Criar e despachar agora', icon: Zap },
      { tipo: 'missao_agendada', label: 'Agendada', sublabel: 'Programar para depois', icon: Calendar },
    ],
  },
  {
    id: 'shuttle',
    label: 'Shuttle',
    icon: Bus,
    tipoEvento: 'shuttle',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    hoverClass: 'hover:bg-emerald-50 hover:border-emerald-400 dark:hover:bg-emerald-950',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    expandedBg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
    subItems: [
      { tipo: 'shuttle_rapido', label: 'Rápido', sublabel: 'Ida e volta direto', icon: Zap },
      { tipo: 'shuttle_completo', label: 'Completo', sublabel: 'Ciclo completo com etapas', icon: ListChecks },
    ],
  },
  {
    id: 'deslocamento',
    label: 'Deslocamento',
    icon: Route,
    tipoEvento: 'missao',
    borderClass: 'border-teal-200 dark:border-teal-800',
    hoverClass: 'hover:bg-teal-50 hover:border-teal-400 dark:hover:bg-teal-950',
    iconClass: 'text-teal-600 dark:text-teal-400',
    expandedBg: '',
    directAction: 'deslocamento',
  },
];

export function NewActionModal({ open, onOpenChange, onSelect, tiposHabilitados }: NewActionModalProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const handleSelect = (tipo: ActionType) => {
    onSelect(tipo);
    onOpenChange(false);
    setExpandedGroup(null);
  };

  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) setExpandedGroup(null);
  };

  const visibleGroups = groups.filter(g => {
    if (tiposHabilitados && tiposHabilitados.length > 0) {
      return tiposHabilitados.includes(g.tipoEvento);
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Nova Operação</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          {visibleGroups.map(group => {
            const Icon = group.icon;
            const isExpanded = expandedGroup === group.id;

            if (group.directAction) {
              return (
                <Button
                  key={group.id}
                  variant="outline"
                  className={`h-auto min-h-[3.5rem] justify-start gap-3 text-base px-4 py-3 ${group.borderClass} ${group.hoverClass}`}
                  onClick={() => handleSelect(group.directAction!)}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${group.iconClass}`} />
                  <span>{group.label}</span>
                </Button>
              );
            }

            return (
              <div key={group.id} className="space-y-1">
                <Button
                  variant="outline"
                  className={cn(
                    `h-auto min-h-[3.5rem] w-full justify-between gap-3 text-base px-4 py-3`,
                    group.borderClass,
                    group.hoverClass,
                    isExpanded && group.expandedBg
                  )}
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${group.iconClass}`} />
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </Button>

                {isExpanded && group.subItems && (
                  <div className="pl-4 space-y-1">
                    {group.subItems.map(sub => {
                      const SubIcon = sub.icon;
                      return (
                        <Button
                          key={sub.tipo}
                          variant="ghost"
                          className={`h-auto w-full justify-start gap-3 text-sm px-3 py-2.5 ${group.hoverClass}`}
                          onClick={() => handleSelect(sub.tipo)}
                        >
                          <SubIcon className={`h-4 w-4 shrink-0 ${group.iconClass}`} />
                          <div className="text-left">
                            <span className="block font-medium">{sub.label}</span>
                            <span className="block text-xs font-normal text-muted-foreground">{sub.sublabel}</span>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
