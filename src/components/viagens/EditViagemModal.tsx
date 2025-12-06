import { useState } from 'react';
import { Clock, Users, Bus, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Viagem } from '@/lib/types/viagem';
import { calcularTempoViagem, formatarMinutos } from '@/lib/utils/calculadores';
import { toast } from 'sonner';

interface EditViagemModalProps {
  viagem: Viagem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (viagem: Viagem) => void;
}

export function EditViagemModal({ viagem, isOpen, onClose, onSave }: EditViagemModalProps) {
  const [form, setForm] = useState({
    h_chegada: viagem.h_chegada || '',
    h_retorno: viagem.h_retorno || '',
    qtd_pax_retorno: viagem.qtd_pax_retorno || 0,
    encerrado: viagem.encerrado
  });

  const handleSave = () => {
    // Validations
    if (form.h_chegada && form.h_chegada < viagem.h_pickup) {
      toast.error('Horário de chegada deve ser após o pickup');
      return;
    }

    if (form.h_retorno && form.h_chegada && form.h_retorno < form.h_chegada) {
      toast.error('Horário de retorno deve ser após a chegada');
      return;
    }

    const updated: Viagem = {
      ...viagem,
      h_chegada: form.h_chegada || null,
      h_retorno: form.h_retorno || null,
      qtd_pax_retorno: form.qtd_pax_retorno,
      encerrado: form.encerrado,
      data_atualizacao: new Date().toISOString()
    };

    toast.success('Viagem atualizada com sucesso!');
    onSave(updated);
  };

  const tempoIda = form.h_chegada 
    ? calcularTempoViagem(viagem.h_pickup, form.h_chegada) 
    : null;
  
  const tempoRetorno = form.h_retorno && form.h_chegada
    ? calcularTempoViagem(form.h_chegada, form.h_retorno)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Viagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fixed Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Motorista</span>
              <p className="text-sm font-medium">{viagem.motorista}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Veículo</span>
              <p className="text-sm font-medium flex items-center gap-1">
                <Bus className="w-3.5 h-3.5" />
                {viagem.veiculo}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Placa</span>
              <code className="text-sm bg-background px-1.5 py-0.5 rounded">{viagem.placa}</code>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Pickup</span>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {viagem.h_pickup}
              </p>
            </div>
            <div className="space-y-1 col-span-2">
              <span className="text-xs text-muted-foreground">Ponto de Embarque</span>
              <p className="text-sm font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {viagem.ponto_embarque || 'Não informado'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">PAX Ida</span>
              <p className="text-sm font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {viagem.qtd_pax}
              </p>
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="h_chegada">Horário de Chegada</Label>
              <Input
                id="h_chegada"
                type="time"
                value={form.h_chegada}
                onChange={(e) => setForm({ ...form, h_chegada: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="h_retorno">Horário de Retorno (opcional)</Label>
              <Input
                id="h_retorno"
                type="time"
                value={form.h_retorno}
                onChange={(e) => setForm({ ...form, h_retorno: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pax_retorno">PAX Retorno</Label>
              <Input
                id="pax_retorno"
                type="number"
                min="0"
                value={form.qtd_pax_retorno}
                onChange={(e) => setForm({ ...form, qtd_pax_retorno: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="encerrado"
                checked={form.encerrado}
                onCheckedChange={(checked) => setForm({ ...form, encerrado: checked === true })}
              />
              <Label htmlFor="encerrado" className="text-sm font-normal cursor-pointer">
                Viagem encerrada
              </Label>
            </div>
          </div>

          {/* Calculations */}
          {(tempoIda !== null || tempoRetorno !== null) && (
            <>
              <Separator />
              <div className="p-3 bg-primary/5 rounded-lg space-y-2">
                <p className="text-xs font-medium text-primary">Cálculos Automáticos</p>
                {tempoIda !== null && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Tempo de Ida:</span>{' '}
                    <span className="font-medium">{formatarMinutos(tempoIda)}</span>
                  </p>
                )}
                {tempoRetorno !== null && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Tempo de Retorno:</span>{' '}
                    <span className="font-medium">{formatarMinutos(tempoRetorno)}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
