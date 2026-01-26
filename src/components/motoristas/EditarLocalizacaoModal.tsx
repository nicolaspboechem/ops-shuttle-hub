import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Loader2 } from 'lucide-react';

interface PontoEmbarque {
  id: string;
  nome: string;
  eh_base?: boolean;
}

interface EditarLocalizacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: { id: string; nome: string } | null;
  pontosEmbarque: PontoEmbarque[];
  localizacaoAtual: string | null;
  onSave: (motoristaId: string, novaLocalizacao: string) => Promise<void>;
}

export function EditarLocalizacaoModal({
  open,
  onOpenChange,
  motorista,
  pontosEmbarque,
  localizacaoAtual,
  onSave,
}: EditarLocalizacaoModalProps) {
  const [novaLocalizacao, setNovaLocalizacao] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!motorista || !novaLocalizacao) return;
    
    setIsSaving(true);
    try {
      await onSave(motorista.id, novaLocalizacao);
      onOpenChange(false);
      setNovaLocalizacao('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNovaLocalizacao('');
    }
    onOpenChange(isOpen);
  };

  if (!motorista) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Editar Localização
          </DialogTitle>
          <DialogDescription>
            Ajuste manualmente a localização do motorista.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Motorista</Label>
            <p className="font-medium">{motorista.nome}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-muted-foreground">Localização Atual</Label>
            <p className="font-medium text-sm">
              {localizacaoAtual || <span className="text-muted-foreground italic">Não definida</span>}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nova-localizacao">Nova Localização</Label>
            <Select value={novaLocalizacao} onValueChange={setNovaLocalizacao}>
              <SelectTrigger id="nova-localizacao">
                <SelectValue placeholder="Selecione a localização..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {pontosEmbarque.map((ponto) => (
                  <SelectItem key={ponto.id} value={ponto.nome}>
                    <span className="flex items-center gap-2">
                      {ponto.eh_base && <MapPin className="w-3 h-3 text-primary" />}
                      {ponto.nome}
                      {ponto.eh_base && <span className="text-xs text-muted-foreground">(Base)</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!novaLocalizacao || isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
