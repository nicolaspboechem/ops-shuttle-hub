import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Truck, Pencil } from 'lucide-react';
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
import { Motorista, Veiculo } from '@/hooks/useCadastros';

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
  ano: z.coerce.number().min(1990).max(2030).optional().or(z.literal('')),
  capacidade: z.coerce.number().min(1).max(100).optional().or(z.literal('')),
});

type MotoristaFormData = z.infer<typeof motoristaSchema>;
type VeiculoFormData = z.infer<typeof veiculoSchema>;

interface MotoristaModalProps {
  motorista?: Motorista;
  defaultName?: string;
  onSave: (data: MotoristaFormData) => Promise<Motorista>;
  onUpdate?: (id: string, data: Partial<MotoristaFormData>) => Promise<void>;
  trigger?: React.ReactNode;
}

export function MotoristaModal({ motorista, defaultName, onSave, onUpdate, trigger }: MotoristaModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!motorista;

  const form = useForm<MotoristaFormData>({
    resolver: zodResolver(motoristaSchema),
    defaultValues: {
      nome: defaultName || '',
      telefone: '',
      cnh: '',
      observacao: '',
    },
  });

  useEffect(() => {
    if (open && motorista) {
      form.reset({
        nome: motorista.nome,
        telefone: motorista.telefone || '',
        cnh: motorista.cnh || '',
        observacao: motorista.observacao || '',
      });
    } else if (open && !motorista) {
      form.reset({
        nome: defaultName || '',
        telefone: '',
        cnh: '',
        observacao: '',
      });
    }
  }, [open, motorista, defaultName, form]);

  const handleSubmit = async (data: MotoristaFormData) => {
    setLoading(true);
    try {
      const formattedData = {
        ...data,
        telefone: data.telefone || null,
        cnh: data.cnh || null,
        observacao: data.observacao || null,
      };

      if (isEditing && onUpdate && motorista) {
        await onUpdate(motorista.id, formattedData);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await onSave(formattedData as any);
        toast.success('Motorista cadastrado com sucesso!');
      }
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
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
              {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VeiculoModalProps {
  motorista: Motorista;
  veiculo?: Veiculo;
  onSave: (data: VeiculoFormData & { motorista_id: string }) => Promise<any>;
  onUpdate?: (id: string, data: Partial<VeiculoFormData>) => Promise<void>;
  trigger?: React.ReactNode;
}

export function VeiculoModal({ motorista, veiculo, onSave, onUpdate, trigger }: VeiculoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!veiculo;

  const form = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      placa: '',
      tipo_veiculo: 'Van',
      marca: '',
      modelo: '',
      ano: '',
      capacidade: '',
    },
  });

  useEffect(() => {
    if (open && veiculo) {
      form.reset({
        placa: veiculo.placa,
        tipo_veiculo: veiculo.tipo_veiculo as 'Ônibus' | 'Van',
        marca: veiculo.marca || '',
        modelo: veiculo.modelo || '',
        ano: veiculo.ano || '',
        capacidade: veiculo.capacidade || '',
      });
    } else if (open && !veiculo) {
      form.reset({
        placa: '',
        tipo_veiculo: 'Van',
        marca: '',
        modelo: '',
        ano: '',
        capacidade: '',
      });
    }
  }, [open, veiculo, form]);

  const handleSubmit = async (data: VeiculoFormData) => {
    setLoading(true);
    try {
      const formattedData = {
        ...data,
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ? Number(data.ano) : null,
        capacidade: data.capacidade ? Number(data.capacidade) : null,
      };

      if (isEditing && onUpdate && veiculo) {
        await onUpdate(veiculo.id, formattedData);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await onSave({
          ...formattedData,
          motorista_id: motorista.id,
        } as any);
        toast.success('Veículo cadastrado com sucesso!');
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
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Pencil className="w-3 h-3" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <Truck className="w-4 h-4 mr-2" />
              Adicionar Veículo
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Veículo ${veiculo?.placa}` : `Cadastrar Veículo para ${motorista.nome}`}
          </DialogTitle>
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
              {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
