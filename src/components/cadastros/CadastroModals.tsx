import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Truck, User } from 'lucide-react';
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

// ============ VEÍCULO MODAL ============
const veiculoSchema = z.object({
  tipo_veiculo: z.enum(['Ônibus', 'Van']),
  placa: z.string().min(7, 'Placa inválida').max(10),
  fornecedor: z.string().max(100).optional(),
  km_inicial: z.number().min(0).optional().nullable(),
  km_final: z.number().min(0).optional().nullable(),
});

type VeiculoFormData = z.infer<typeof veiculoSchema>;

interface VeiculoModalProps {
  veiculo?: Veiculo;
  eventoId?: string;
  onSave: (data: { placa: string; tipo_veiculo: string; fornecedor: string | null; evento_id?: string }) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Veiculo>, oldPlaca: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export function VeiculoModal({ veiculo, eventoId, onSave, onUpdate, trigger }: VeiculoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!veiculo;

  const form = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      tipo_veiculo: 'Van',
      placa: '',
      fornecedor: '',
      km_inicial: null,
      km_final: null,
    },
  });

  useEffect(() => {
    if (open && veiculo) {
      form.reset({
        tipo_veiculo: (veiculo.tipo_veiculo as 'Ônibus' | 'Van') || 'Van',
        placa: veiculo.placa || '',
        fornecedor: veiculo.fornecedor || '',
        km_inicial: veiculo.km_inicial ?? null,
        km_final: veiculo.km_final ?? null,
      });
    } else if (open && !veiculo) {
      form.reset({
        tipo_veiculo: 'Van',
        placa: '',
        fornecedor: '',
        km_inicial: null,
        km_final: null,
      });
    }
  }, [open, veiculo, form]);

  const handleSubmit = async (data: VeiculoFormData) => {
    setLoading(true);
    try {
      const veiculoData = {
        placa: data.placa.toUpperCase(),
        tipo_veiculo: data.tipo_veiculo,
        fornecedor: data.fornecedor || null,
        km_inicial: data.km_inicial ?? null,
        km_final: data.km_final ?? null,
        evento_id: eventoId,
      };

      if (isEditing && onUpdate && veiculo) {
        await onUpdate(veiculo.id, veiculoData, veiculo.placa);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await onSave(veiculoData);
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="w-4 h-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Veículo
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {isEditing ? 'Editar Veículo' : 'Cadastrar Veículo'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="placa">Placa *</Label>
              <Input
                id="placa"
                placeholder="ABC-1234"
                {...form.register('placa')}
                className="uppercase"
              />
              {form.formState.errors.placa && (
                <p className="text-xs text-destructive">{form.formState.errors.placa.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Input
              id="fornecedor"
              placeholder="Nome do fornecedor (opcional)"
              {...form.register('fornecedor')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="km_inicial">KM Inicial</Label>
              <Input
                id="km_inicial"
                type="number"
                placeholder="0"
                {...form.register('km_inicial', { 
                  setValueAs: (v) => v === '' ? null : Number(v) 
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_final">KM Final</Label>
              <Input
                id="km_final"
                type="number"
                placeholder="0"
                {...form.register('km_final', { 
                  setValueAs: (v) => v === '' ? null : Number(v) 
                })}
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

// ============ MOTORISTA MODAL ============
const motoristaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  telefone: z.string().max(20).optional(),
  veiculo_id: z.string().optional(),
});

type MotoristaFormData = z.infer<typeof motoristaSchema>;

interface MotoristaModalProps {
  motorista?: Motorista;
  veiculosDisponiveis: Veiculo[];
  defaultName?: string;
  eventoId?: string;
  onSave: (data: { nome: string; telefone: string | null; veiculo_id: string | null; ativo: boolean; evento_id?: string }) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Motorista>, oldNome: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export function MotoristaModal({ 
  motorista, 
  veiculosDisponiveis,
  defaultName,
  eventoId,
  onSave, 
  onUpdate, 
  trigger 
}: MotoristaModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!motorista;

  const form = useForm<MotoristaFormData>({
    resolver: zodResolver(motoristaSchema),
    defaultValues: {
      nome: defaultName || '',
      telefone: '',
      veiculo_id: '',
    },
  });

  useEffect(() => {
    if (open && motorista) {
      form.reset({
        nome: motorista.nome,
        telefone: motorista.telefone || '',
        veiculo_id: motorista.veiculo_id || '',
      });
    } else if (open && !motorista) {
      form.reset({
        nome: defaultName || '',
        telefone: '',
        veiculo_id: '',
      });
    }
  }, [open, motorista, defaultName, form]);

  const handleSubmit = async (data: MotoristaFormData) => {
    setLoading(true);
    try {
      const motoristaData = {
        nome: data.nome,
        telefone: data.telefone || null,
        veiculo_id: data.veiculo_id || null,
        ativo: true,
        evento_id: eventoId,
      };

      if (isEditing && onUpdate && motorista) {
        await onUpdate(motorista.id, motoristaData, motorista.nome);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await onSave(motoristaData);
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

  // Filtrar veículos disponíveis (sem motorista vinculado ou vinculado ao motorista atual)
  const veiculosParaSelecao = veiculosDisponiveis.filter(v => {
    if (!motorista) return true; // Criando novo: mostrar todos
    // Editando: mostrar veículos sem motorista ou já vinculados a este motorista
    return !v.motorista_id || v.id === motorista.veiculo_id;
  });

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
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {isEditing ? 'Editar Motorista' : 'Cadastrar Motorista'}
          </DialogTitle>
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
            <Label htmlFor="telefone">WhatsApp</Label>
            <Input
              id="telefone"
              placeholder="(11) 99999-9999"
              {...form.register('telefone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="veiculo_id">Veículo Vinculado</Label>
            <Select
              value={form.watch('veiculo_id') || ''}
              onValueChange={(value) => form.setValue('veiculo_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {veiculosParaSelecao.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.tipo_veiculo} - {v.placa} {v.fornecedor ? `(${v.fornecedor})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {veiculosParaSelecao.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum veículo disponível. Cadastre veículos primeiro.
              </p>
            )}
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

// ============ LEGACY: Motorista + Veículo juntos (mantido para compatibilidade) ============
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
  eventoId?: string;
  onSave: (motoristaData: { nome: string; telefone: string | null; ativo: boolean; evento_id?: string }, veiculoData: { placa: string; tipo_veiculo: string; evento_id?: string }) => Promise<void>;
  onUpdate?: (motoristaId: string, motoristaData: Partial<Motorista>, veiculoId: string | null, veiculoData: Partial<Veiculo> | null, oldNome: string, oldPlaca: string | null) => Promise<void>;
  trigger?: React.ReactNode;
}

export function MotoristaComVeiculoModal({ 
  motorista, 
  veiculo,
  defaultName,
  eventoId,
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
        evento_id: eventoId,
      };

      const veiculoData = {
        placa: data.placa,
        tipo_veiculo: data.tipo_veiculo,
        evento_id: eventoId,
      };

      if (isEditing && onUpdate && motorista) {
        const oldNome = motorista.nome;
        const oldPlaca = veiculo?.placa || null;
        await onUpdate(motorista.id, motoristaData, veiculo?.id || null, veiculoData, oldNome, oldPlaca);
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
