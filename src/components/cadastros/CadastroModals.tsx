import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Truck, User, Bus, CheckCircle, AlertTriangle, Loader, Fuel } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Motorista, Veiculo } from '@/hooks/useCadastros';

// ============ VEÍCULO MODAL ============
const veiculoSchema = z.object({
  tipo_veiculo: z.enum(['Ônibus', 'Van', 'Sedan', 'SUV']),
  placa: z.string().min(7, 'Placa inválida').max(10),
  nome: z.string().max(100).optional(),
  fornecedor: z.string().max(100).optional(),
  km_inicial: z.number().min(0).optional().nullable(),
  km_final: z.number().min(0).optional().nullable(),
}).refine((data) => {
  if (data.km_inicial != null && data.km_final != null) {
    return data.km_final > data.km_inicial;
  }
  return true;
}, {
  message: 'KM Final deve ser maior que KM Inicial',
  path: ['km_final'],
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
      nome: '',
      fornecedor: '',
      km_inicial: null,
      km_final: null,
    },
  });

  useEffect(() => {
    if (open && veiculo) {
      form.reset({
        tipo_veiculo: (veiculo.tipo_veiculo as 'Ônibus' | 'Van' | 'Sedan' | 'SUV') || 'Van',
        placa: veiculo.placa || '',
        nome: veiculo.nome || '',
        fornecedor: veiculo.fornecedor || '',
        km_inicial: veiculo.km_inicial ?? null,
        km_final: veiculo.km_final ?? null,
      });
    } else if (open && !veiculo) {
      form.reset({
        tipo_veiculo: 'Van',
        placa: '',
        nome: '',
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
        nome: data.nome || null,
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
                onValueChange={(value) => form.setValue('tipo_veiculo', value as 'Ônibus' | 'Van' | 'Sedan' | 'SUV')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Van">Van</SelectItem>
                  <SelectItem value="Ônibus">Ônibus</SelectItem>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
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
            <Label htmlFor="nome">Nome/Apelido</Label>
            <Input
              id="nome"
              placeholder="Sprinter 01 (opcional)"
              {...form.register('nome')}
            />
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
  onSave: (data: { nome: string; telefone: string | null; veiculo_id: string | null; ativo: boolean; evento_id?: string }) => Promise<string | undefined | void>;
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
  const veiculosParaSelecao = useMemo(() => {
    const filtered = veiculosDisponiveis.filter(v => {
      if (!motorista) return true; // Criando novo: mostrar todos
      // Editando: mostrar veículos sem motorista ou já vinculados a este motorista
      return !v.motorista_id || v.id === motorista.veiculo_id;
    });

    // Ordenar por status: liberados primeiro, depois pendentes, depois em inspeção
    const statusOrder: Record<string, number> = { liberado: 0, pendente: 1, em_inspecao: 2, manutencao: 3 };
    return filtered.sort((a, b) => {
      const statusA = statusOrder[a.status || 'em_inspecao'] ?? 2;
      const statusB = statusOrder[b.status || 'em_inspecao'] ?? 2;
      if (statusA !== statusB) return statusA - statusB;
      return a.placa.localeCompare(b.placa);
    });
  }, [veiculosDisponiveis, motorista]);

  // Agrupar veículos por status
  const veiculosAgrupados = useMemo(() => {
    const liberados = veiculosParaSelecao.filter(v => v.status === 'liberado');
    const pendentes = veiculosParaSelecao.filter(v => v.status === 'pendente');
    const emInspecao = veiculosParaSelecao.filter(v => !v.status || v.status === 'em_inspecao');
    const manutencao = veiculosParaSelecao.filter(v => v.status === 'manutencao');
    return { liberados, pendentes, emInspecao, manutencao };
  }, [veiculosParaSelecao]);

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'liberado':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
            <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
            Liberado
          </Badge>
        );
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            Pendente
          </Badge>
        );
      case 'manutencao':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0">
            Manutenção
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
            <Loader className="w-2.5 h-2.5 mr-0.5" />
            Em Inspeção
          </Badge>
        );
    }
  };

  const getFuelIndicator = (level: string | null | undefined) => {
    if (!level) return null;
    const fuelLevels: Record<string, { percentage: number; color: string }> = {
      vazio: { percentage: 0, color: 'bg-destructive' },
      '1/4': { percentage: 25, color: 'bg-amber-500' },
      '1/2': { percentage: 50, color: 'bg-amber-500' },
      '3/4': { percentage: 75, color: 'bg-emerald-500' },
      cheio: { percentage: 100, color: 'bg-emerald-500' },
    };
    const config = fuelLevels[level] || fuelLevels['1/2'];
    return (
      <div className="flex items-center gap-1 text-[10px]">
        <Fuel className="w-2.5 h-2.5 text-muted-foreground" />
        <div className="w-6 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full', config.color)} style={{ width: `${config.percentage}%` }} />
        </div>
      </div>
    );
  };

  const VeiculoOption = ({ veiculo, isSelected }: { veiculo: Veiculo; isSelected: boolean }) => (
    <label
      htmlFor={veiculo.id}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <RadioGroupItem value={veiculo.id} id={veiculo.id} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded',
            veiculo.tipo_veiculo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600'
          )}>
            <Bus className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-sm">{veiculo.tipo_veiculo}</span>
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{veiculo.placa}</code>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {getStatusBadge(veiculo.status)}
          {getFuelIndicator(veiculo.nivel_combustivel)}
          {veiculo.possui_avarias && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0">
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              Avarias
            </Badge>
          )}
        </div>
        {veiculo.fornecedor && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {veiculo.fornecedor}
          </p>
        )}
      </div>
    </label>
  );

  const renderVeiculoGroup = (veiculos: Veiculo[], title: string, selectedId: string) => {
    if (veiculos.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="space-y-2">
          {veiculos.map(v => (
            <VeiculoOption key={v.id} veiculo={v} isSelected={v.id === selectedId} />
          ))}
        </div>
      </div>
    );
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
      <DialogContent className="sm:max-w-[500px]">
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
            <Label>Veículo Vinculado</Label>
            {veiculosParaSelecao.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center">
                <Truck className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum veículo disponível
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cadastre veículos primeiro
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-lg border p-2">
                <RadioGroup
                  value={form.watch('veiculo_id') || 'none'}
                  onValueChange={(value) => form.setValue('veiculo_id', value === 'none' ? '' : value)}
                  className="space-y-3"
                >
                  {/* Opção Nenhum */}
                  <label
                    htmlFor="none"
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      !form.watch('veiculo_id') || form.watch('veiculo_id') === 'none'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <RadioGroupItem value="none" id="none" />
                    <span className="text-sm text-muted-foreground">Nenhum veículo</span>
                  </label>
                  
                  {/* Veículos agrupados */}
                  {renderVeiculoGroup(veiculosAgrupados.liberados, '✓ Liberados', form.watch('veiculo_id') || '')}
                  {renderVeiculoGroup(veiculosAgrupados.pendentes, '⚠ Pendentes', form.watch('veiculo_id') || '')}
                  {renderVeiculoGroup(veiculosAgrupados.emInspecao, '🔄 Em Inspeção', form.watch('veiculo_id') || '')}
                  {renderVeiculoGroup(veiculosAgrupados.manutencao, '🔧 Manutenção', form.watch('veiculo_id') || '')}
                </RadioGroup>
              </ScrollArea>
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
