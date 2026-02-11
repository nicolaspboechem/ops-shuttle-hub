import { useState } from 'react';
import { MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChamarBaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaComVeiculo | null;
  baseNome: string;
  onConfirm: () => Promise<void>;
}

export function ChamarBaseModal({ open, onOpenChange, motorista, baseNome, onConfirm }: ChamarBaseModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onOpenChange(false);
  };

  if (!motorista) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chamar para Base</AlertDialogTitle>
          <AlertDialogDescription>
            Criar missão de retorno para <strong>{motorista.nome}</strong>?
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              {motorista.ultima_localizacao || 'Local desconhecido'} → {baseNome}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? 'Criando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
