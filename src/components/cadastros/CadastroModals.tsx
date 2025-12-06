import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Motorista, Veiculo } from '@/hooks/useCadastros';

// Schema unificado: Motorista + Veículo juntos
const motoristaComVeiculoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  telefone: z.string().max(20).optional(),
  tipo_veiculo: z.enum(['Ônibus', 'Van']),
  placa: z.string().min(7, 'Placa inválida').max(10),
});

type MotoristaComVeiculoFormData = z.infer<typeof motoristaComVeiculoSchema>;

interface MotoristaComVeiculoModalProps {
  motorista?: Motorista;
  veiculo?: Veiculo;
  defaultName?: string;
  onSave: (motoristaData: { nome: string; telefone: string | null; ativo: boolean }, veiculoData: { placa: string; tipo_veiculo: string; motorista_id?: string }) => Promise<void>;
  onUpdate?: (motoristaId: string, motoristaData: Partial<Motorista>, veiculoId: string | null, veiculoData: Partial<Veiculo> | null) => Promise<void>;
  trigger?: React.ReactNode;
}

export function MotoristaComVeiculoModal({ 
  motorista, 
  veiculo,
  defaultName, 
  onSave, 
  onUpdate, 
  trigger 
}: MotoristaComVeiculoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!motorista;

  const form = useForm<MotoristaComVeiculoFormData>({
    resolver: zodResolver(motoristaComVeiculoSchema),
    defaultValues: {
      nome: defaultName || '',
      telefone: '',
      tipo_veiculo: 'Van',
      placa: '',
    },
  });

  useEffect(() => {
    if (open && motorista) {
      form.reset({
        nome: motorista.nome,
        telefone: motorista.telefone || '',
        tipo_veiculo: (veiculo?.tipo_veiculo as 'Ônibus' | 'Van') || 'Van',
        placa: veiculo?.placa || '',
      });
    } else if (open && !motorista) {
      form.reset({
        nome: defaultName || '',
        telefone: '',
        tipo_veiculo: 'Van',
        placa: '',
      });
    }
  }, [open, motorista, veiculo, defaultName, form]);

  const handleSubmit = async (data: MotoristaComVeiculoFormData) => {
    setLoading(true);
    try {
      const motoristaData = {
        nome: data.nome,
        telefone: data.telefone || null,
        ativo: true,
      };

      const veiculoData = {
        placa: data.placa,
        tipo_veiculo: data.tipo_veiculo,
      };

      if (isEditing && onUpdate && motorista) {
        await onUpdate(motorista.id, motoristaData, veiculo?.id || null, veiculoData);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await onSave(motoristaData, veiculoData);
        toast.success('Motorista cadastrado com sucesso!');
      }
      form.reset();
      setOpen(false);
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Esta placa já está cadastrada!');
      } else {
        toast.error(`Erro ao salvar: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="w-4 h-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Motorista
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Motorista' : 'Cadastrar Motorista'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              {...form.register('nome')}
            />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Celular</Label>
            <Input
              id="telefone"
              placeholder="(11) 99999-9999"
              {...form.register('telefone')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_veiculo">Tipo Veículo *</Label>
              <Select
                value={form.watch('tipo_veiculo')}
                onValueChange={(value) => form.setValue('tipo_veiculo', value as 'Ônibus' | 'Van')}
              >
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
              <Label htmlFor="placa">Placa *</Label>
              <Input
                id="placa"
                placeholder="ABC-1234"
                {...form.register('placa')}
              />
              {form.formState.errors.placa && (
                <p className="text-xs text-destructive">{form.formState.errors.placa.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
