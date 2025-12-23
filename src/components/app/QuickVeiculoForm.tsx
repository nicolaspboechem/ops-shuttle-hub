import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickVeiculoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated: () => void;
}

export function QuickVeiculoForm({
  open,
  onOpenChange,
  eventoId,
  onCreated
}: QuickVeiculoFormProps) {
  const { user } = useAuth();
  const [placa, setPlaca] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState('Van');
  const [capacidade, setCapacidade] = useState('15');
  const [fornecedor, setFornecedor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!placa.trim()) {
      toast.error('Informe a placa do veículo');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('veiculos')
        .insert([{
          evento_id: eventoId,
          placa: placa.trim().toUpperCase(),
          tipo_veiculo: tipoVeiculo,
          capacidade: capacidade ? parseInt(capacidade) : 15,
          fornecedor: fornecedor.trim() || null,
          ativo: true,
          criado_por: user?.id || null,
          atualizado_por: user?.id || null
        }]);

      if (error) {
        console.error('Erro ao criar veículo:', error);
        if (error.code === '23505') {
          toast.error('Já existe um veículo com esta placa');
        } else {
          toast.error('Erro ao criar veículo');
        }
        return;
      }

      toast.success('Veículo cadastrado!');
      onCreated();
      onOpenChange(false);
      setPlaca('');
      setTipoVeiculo('Van');
      setCapacidade('15');
      setFornecedor('');
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar veículo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Veículo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="placa">Placa *</Label>
            <Input
              id="placa"
              value={placa}
              onChange={e => setPlaca(e.target.value)}
              placeholder="ABC1234"
              required
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Veículo *</Label>
            <Select value={tipoVeiculo} onValueChange={setTipoVeiculo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Ônibus">Ônibus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacidade">Capacidade</Label>
            <Input
              id="capacidade"
              type="number"
              value={capacidade}
              onChange={e => setCapacidade(e.target.value)}
              placeholder="15"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Input
              id="fornecedor"
              value={fornecedor}
              onChange={e => setFornecedor(e.target.value)}
              placeholder="Nome do fornecedor"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cadastrar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
