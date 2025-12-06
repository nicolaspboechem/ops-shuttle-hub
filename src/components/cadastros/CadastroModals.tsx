import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Truck } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Motorista } from '@/hooks/useCadastros';

const motoristaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  telefone: z.string().max(20).optional(),
  cnh: z.string().max(20).optional(),
  observacao: z.string().max(500).optional(),
});

const veiculoSchema = z.object({
  placa: z.string().min(7, 'Placa inválida').max(10),
  tipo_veiculo: z.enum(['Ônibus', 'Van']),
  marca: z.string().max(50).optional(),
  modelo: z.string().max(50).optional(),
  ano: z.coerce.number().min(1990).max(2030).optional(),
  capacidade: z.coerce.number().min(1).max(100).optional(),
});

type MotoristaFormData = z.infer<typeof motoristaSchema>;
type VeiculoFormData = z.infer<typeof veiculoSchema>;

interface MotoristaModalProps {
  onSave: (data: MotoristaFormData) => Promise<Motorista>;
  trigger?: React.ReactNode;
}

export function MotoristaModal({ onSave, trigger }: MotoristaModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<MotoristaFormData>({
    resolver: zodResolver(motoristaSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      cnh: '',
      observacao: '',
    },
  });

  const handleSubmit = async (data: MotoristaFormData) => {
    setLoading(true);
    try {
      await onSave({
        ...data,
        telefone: data.telefone || null,
        cnh: data.cnh || null,
        observacao: data.observacao || null,
      } as any);
      toast.success('Motorista cadastrado com sucesso!');
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Motorista
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Motorista</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                {...form.register('telefone')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnh">CNH</Label>
              <Input
                id="cnh"
                placeholder="Número da CNH"
                {...form.register('cnh')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Observações sobre o motorista"
              {...form.register('observacao')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VeiculoModalProps {
  motorista: Motorista;
  onSave: (data: VeiculoFormData & { motorista_id: string }) => Promise<any>;
  trigger?: React.ReactNode;
}

export function VeiculoModal({ motorista, onSave, trigger }: VeiculoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      placa: '',
      tipo_veiculo: 'Van',
      marca: '',
      modelo: '',
    },
  });

  const handleSubmit = async (data: VeiculoFormData) => {
    setLoading(true);
    try {
      await onSave({
        ...data,
        motorista_id: motorista.id,
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano || null,
        capacidade: data.capacidade || null,
      } as any);
      toast.success('Veículo cadastrado com sucesso!');
      form.reset();
      setOpen(false);
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Esta placa já está cadastrada!');
      } else {
        toast.error(`Erro ao cadastrar: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Truck className="w-4 h-4 mr-2" />
            Adicionar Veículo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Veículo para {motorista.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="tipo_veiculo">Tipo *</Label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                placeholder="Ex: Mercedes"
                {...form.register('marca')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                placeholder="Ex: Sprinter"
                {...form.register('modelo')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                placeholder="2024"
                {...form.register('ano')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacidade">Capacidade (PAX)</Label>
              <Input
                id="capacidade"
                type="number"
                placeholder="15"
                {...form.register('capacidade')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
