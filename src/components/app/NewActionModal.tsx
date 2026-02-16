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
  hideShuttle?: boolean;
}

export function NewActionModal({ open, onOpenChange, onSelect, hideShuttle }: NewActionModalProps) {
  const handleSelect = (tipo: ActionType) => {
    onSelect(tipo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Nova Operação</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className="h-14 justify-start gap-3 text-base border-purple-200 hover:bg-purple-50 hover:border-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
            onClick={() => handleSelect('missao')}
          >
            <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span>Missão</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 justify-start gap-3 text-base border-teal-200 hover:bg-teal-50 hover:border-teal-400 dark:border-teal-800 dark:hover:bg-teal-950"
            onClick={() => handleSelect('deslocamento')}
          >
            <Route className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span>Deslocamento</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 justify-start gap-3 text-base"
            onClick={() => handleSelect('transfer')}
          >
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Transfer</span>
          </Button>
          {!hideShuttle && (
            <Button
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              onClick={() => handleSelect('shuttle')}
            >
              <Bus className="h-5 w-5 text-primary" />
              <span>Shuttle</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
