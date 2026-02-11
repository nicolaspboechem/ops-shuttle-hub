import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Calendar } from 'lucide-react';

export type MissaoTipo = 'instantanea' | 'agendada';

interface MissaoTipoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tipo: MissaoTipo) => void;
}

export function MissaoTipoModal({ open, onOpenChange, onSelect }: MissaoTipoModalProps) {
  const handleSelect = (tipo: MissaoTipo) => {
    onSelect(tipo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Que tipo de missão?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className="h-16 justify-start gap-3 text-base border-amber-200 hover:bg-amber-50 hover:border-amber-400 dark:border-amber-800 dark:hover:bg-amber-950"
            onClick={() => handleSelect('instantanea')}
          >
            <Zap className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <div className="font-medium">Missão Instantânea</div>
              <div className="text-xs text-muted-foreground">Rápida: motorista, A → B</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-16 justify-start gap-3 text-base"
            onClick={() => handleSelect('agendada')}
          >
            <Calendar className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Missão Agendada</div>
              <div className="text-xs text-muted-foreground">Completa: data, horário, pax...</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
