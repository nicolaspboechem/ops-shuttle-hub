import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { useServerTime } from '@/hooks/useServerTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { QuickMotoristaForm } from './QuickMotoristaForm';
import { toast } from 'sonner';
import { Plus, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateViagemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated: () => void;
}

export function CreateViagemForm({
  open,
  onOpenChange,
  eventoId,
  onCreated
}: CreateViagemFormProps) {
  const { user } = useAuth();
  const { pontos } = usePontosEmbarque(eventoId);
  const { motoristas, refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  const { getAgoraSync } = useServerTime();

  const [motorista, setMotorista] = useState('');
  const [motoristaOpen, setMotoristaOpen] = useState(false);
  const [placa, setPlaca] = useState('');
  const [placaOpen, setPlacaOpen] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState<string>('Van');
  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [qtdPax, setQtdPax] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState('transfer');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [showQuickMotorista, setShowQuickMotorista] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setMotorista('');
      setPlaca('');
      setTipoVeiculo('Van');
      setPontoEmbarque('');
      setPontoDesembarque('');
      setQtdPax('');
      setTipoOperacao('transfer');
      setObservacao('');
    }
  }, [open]);

  // Auto-fill vehicle when selecting motorista with linked vehicle
  const handleMotoristaChange = (nome: string) => {
    setMotorista(nome);
    setMotoristaOpen(false);
    
    // Find linked vehicle for this motorista
    const motoristaData = motoristas.find(m => m.nome === nome);
    if (motoristaData?.veiculo_id) {
      const veiculo = veiculos.find(v => v.id === motoristaData.veiculo_id);
      if (veiculo) {
        setPlaca(veiculo.placa);
        setTipoVeiculo(veiculo.tipo_veiculo);
      }
    }
  };

  // Auto-fill vehicle type when selecting placa
  const handlePlacaChange = (value: string) => {
    setPlaca(value);
    setPlacaOpen(false);
    const veiculo = veiculos.find(v => v.placa === value);
    if (veiculo) {
      setTipoVeiculo(veiculo.tipo_veiculo);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motorista || !pontoEmbarque) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const agora = getAgoraSync();
      const horaPickup = agora.toTimeString().slice(0, 8);

      const { error } = await supabase
        .from('viagens')
        .insert([{
          evento_id: eventoId,
          motorista,
          placa: placa || null,
          tipo_veiculo: tipoVeiculo,
          ponto_embarque: pontoEmbarque,
          ponto_desembarque: pontoDesembarque || null,
          qtd_pax: qtdPax ? parseInt(qtdPax) : 0,
          tipo_operacao: tipoOperacao,
          observacao: observacao || null,
          status: 'em_andamento',
          h_pickup: horaPickup,
          h_inicio_real: agora.toISOString(),
          iniciado_por: user?.id
        }]);

      if (error) {
        console.error('Erro ao criar viagem:', error);
        toast.error('Erro ao criar viagem');
        return;
      }

      // Registrar log
      const { data: viagemData } = await supabase
        .from('viagens')
        .select('id')
        .eq('evento_id', eventoId)
        .eq('motorista', motorista)
        .eq('h_pickup', horaPickup)
        .order('data_criacao', { ascending: false })
        .limit(1)
        .single();

      if (viagemData) {
        await supabase.from('viagem_logs').insert([{
          viagem_id: viagemData.id,
          user_id: user?.id,
          acao: 'inicio',
          detalhes: { motorista, placa, ponto_embarque: pontoEmbarque, ponto_desembarque: pontoDesembarque }
        }]);
      }

      toast.success('Viagem criada e iniciada!');
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar viagem');
    } finally {
      setSaving(false);
    }
  };

  const activePontos = pontos.filter(p => p.ativo);
  const activeMotoristas = motoristas.filter(m => m.ativo);
  const activeVeiculos = veiculos.filter(v => v.ativo);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle>Nova Viagem</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
            {/* Motorista - Combobox with search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Motorista *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickMotorista(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Novo
                </Button>
              </div>
              <Popover open={motoristaOpen} onOpenChange={setMotoristaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={motoristaOpen}
                    className="w-full justify-between font-normal"
                  >
                    {motorista || "Buscar motorista..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar motorista..." />
                    <CommandList>
                      <CommandEmpty>Nenhum motorista encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activeMotoristas.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.nome}
                            onSelect={() => handleMotoristaChange(m.nome)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                motorista === m.nome ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {m.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Veículo/Placa - Combobox with search */}
            <div className="space-y-2">
              <Label>Veículo/Placa</Label>
              <Popover open={placaOpen} onOpenChange={setPlacaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={placaOpen}
                    className="w-full justify-between font-normal"
                  >
                    {placa ? `${placa} - ${veiculos.find(v => v.placa === placa)?.tipo_veiculo || ''}` : "Buscar veículo..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por placa..." />
                    <CommandList>
                      <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activeVeiculos.map((v) => (
                          <CommandItem
                            key={v.id}
                            value={v.placa}
                            onSelect={() => handlePlacaChange(v.placa)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                placa === v.placa ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {v.placa} - {v.tipo_veiculo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tipo de Veículo */}
            <div className="space-y-2">
              <Label>Tipo de Veículo</Label>
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

            {/* Ponto de Embarque */}
            <div className="space-y-2">
              <Label>Ponto de Embarque *</Label>
              <Select value={pontoEmbarque} onValueChange={setPontoEmbarque}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o embarque" />
                </SelectTrigger>
                <SelectContent>
                  {activePontos.map(p => (
                    <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ponto de Desembarque */}
            <div className="space-y-2">
              <Label>Ponto de Desembarque</Label>
              <Select value={pontoDesembarque} onValueChange={setPontoDesembarque}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o desembarque" />
                </SelectTrigger>
                <SelectContent>
                  {activePontos.map(p => (
                    <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade de PAX e Tipo de Operação */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd PAX</Label>
                <Input
                  type="number"
                  value={qtdPax}
                  onChange={e => setQtdPax(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoOperacao} onValueChange={setTipoOperacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="shuttle">Shuttle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancelar
                </Button>
              </DrawerClose>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar e Iniciar'
                )}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <QuickMotoristaForm
        open={showQuickMotorista}
        onOpenChange={setShowQuickMotorista}
        eventoId={eventoId}
        onCreated={(nome) => {
          refetchMotoristas();
          setMotorista(nome);
        }}
      />
    </>
  );
}