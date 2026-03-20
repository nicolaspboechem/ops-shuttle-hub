import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useServerTime } from '@/hooks/useServerTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { scrollInputIntoView } from '@/lib/utils/scrollInputIntoView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Note: Select is still used for tipoVeiculo field
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
import { CreateMotoristaWizard } from '@/components/motoristas/CreateMotoristaWizard';
import { toast } from 'sonner';
import { Plus, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateViagemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  defaultTipoOperacao?: string;
  onCreated: () => void;
}

export function CreateViagemForm({
  open,
  onOpenChange,
  eventoId,
  defaultTipoOperacao,
  onCreated
}: CreateViagemFormProps) {
  const { userId, userName } = useCurrentUser();
  const { motoristas, refetch: refetchMotoristas } = useMotoristas(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const { getAgoraSync } = useServerTime();

  const [motorista, setMotorista] = useState('');
  const [motoristaOpen, setMotoristaOpen] = useState(false);
  const [placa, setPlaca] = useState('');
  const [placaOpen, setPlacaOpen] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState<string>('Van');
  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoEmbarqueOpen, setPontoEmbarqueOpen] = useState(false);
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [pontoDesembarqueOpen, setPontoDesembarqueOpen] = useState(false);
  const [qtdPax, setQtdPax] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState('shuttle');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const [showQuickMotorista, setShowQuickMotorista] = useState(false);

  const activePontos = pontos.filter(p => p.ativo);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setMotorista('');
      setPlaca('');
      setTipoVeiculo('Van');
      setPontoEmbarque('');
      setPontoDesembarque('');
      setQtdPax('');
      setTipoOperacao(defaultTipoOperacao || 'shuttle');
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
    
    // Proteção anti-duplicata (ref é síncrono, state pode ter delay)
    if (submittingRef.current) return;
    submittingRef.current = true;
    
    if (!motorista || !pontoEmbarque) {
      toast.error('Preencha os campos obrigatórios');
      submittingRef.current = false;
      return;
    }

    setSaving(true);

    try {
      const agora = getAgoraSync();
      const horaPickup = agora.toTimeString().slice(0, 8);

      // Resolver IDs a partir dos nomes selecionados
      const motoristaData = motoristas.find(m => m.nome === motorista);
      const veiculoData = veiculos.find(v => v.placa === placa);
      const pontoEmbarqueData = pontos.find(p => p.nome === pontoEmbarque);
      const pontoDesembarqueData = pontos.find(p => p.nome === pontoDesembarque);

      // Trigger no banco preenche automaticamente: motorista, placa, tipo_veiculo
      const { data: viagemCriada, error } = await supabase
        .from('viagens')
        .insert([{
          evento_id: eventoId,
          motorista_id: motoristaData?.id || null,
          veiculo_id: veiculoData?.id || null,
          ponto_embarque_id: pontoEmbarqueData?.id || null,
          ponto_desembarque_id: pontoDesembarqueData?.id || null,
          // motorista é NOT NULL no banco - trigger preenche via motorista_id, mas fallback manual
          motorista: motoristaData?.id ? motorista : motorista,
          ponto_embarque: pontoEmbarque,
          ponto_desembarque: pontoDesembarque || null,
          qtd_pax: qtdPax ? parseInt(qtdPax) : 0,
          tipo_operacao: tipoOperacao,
          observacao: observacao || null,
          status: 'em_andamento',
          h_pickup: horaPickup,
          h_inicio_real: agora.toISOString(),
          iniciado_por: userId,
          criado_por: userId,
          atualizado_por: userId
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar viagem:', error);
        toast.error('Erro ao criar viagem');
        return;
      }

      // Registrar log usando ID retornado diretamente
      if (viagemCriada) {
        await supabase.from('viagem_logs').insert([{
          viagem_id: viagemCriada.id,
          user_id: userId,
          acao: 'inicio',
          detalhes: { motorista, placa, ponto_embarque: pontoEmbarque, ponto_desembarque: pontoDesembarque, nome_usuario: userName }
        }]);
      }

      // Atualizar status do motorista para em_viagem
      if (motoristaData?.id) {
        await supabase
          .from('motoristas')
          .update({ status: 'em_viagem' })
          .eq('id', motoristaData.id);
      }

      toast.success('Viagem criada e iniciada!');
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar viagem');
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  };

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
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Blindado">Blindado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ponto de Embarque */}
            <div className="space-y-2">
              <Label>Ponto de Embarque *</Label>
              <Popover open={pontoEmbarqueOpen} onOpenChange={setPontoEmbarqueOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pontoEmbarqueOpen}
                    className="w-full justify-between font-normal"
                  >
                    {pontoEmbarque || "Selecionar ponto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar ou digitar..." />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                            if (input?.value) {
                              setPontoEmbarque(input.value);
                              setPontoEmbarqueOpen(false);
                            }
                          }}
                        >
                          Usar texto digitado
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {activePontos.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.nome}
                            onSelect={() => {
                              setPontoEmbarque(p.nome);
                              setPontoEmbarqueOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                pontoEmbarque === p.nome ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ponto de Desembarque */}
            <div className="space-y-2">
              <Label>Ponto de Desembarque</Label>
              <Popover open={pontoDesembarqueOpen} onOpenChange={setPontoDesembarqueOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pontoDesembarqueOpen}
                    className="w-full justify-between font-normal"
                  >
                    {pontoDesembarque || "Selecionar ponto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar ou digitar..." />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                            if (input?.value) {
                              setPontoDesembarque(input.value);
                              setPontoDesembarqueOpen(false);
                            }
                          }}
                        >
                          Usar texto digitado
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {activePontos.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.nome}
                            onSelect={() => {
                              setPontoDesembarque(p.nome);
                              setPontoDesembarqueOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                pontoDesembarque === p.nome ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Quantidade de PAX */}
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

      <CreateMotoristaWizard
        open={showQuickMotorista}
        onOpenChange={setShowQuickMotorista}
        veiculos={veiculos}
        eventoId={eventoId}
        onSubmit={async (data) => {
          const { data: motorista, error } = await supabase
            .from('motoristas')
            .insert([{
              nome: data.nome,
              telefone: data.telefone,
              veiculo_id: data.veiculo_id,
              evento_id: eventoId,
              ativo: true,
            }])
            .select('id, nome')
            .single();
          
          if (error) throw error;
          
          refetchMotoristas();
          setMotorista(motorista.nome);
          return motorista.id;
        }}
      />
    </>
  );
}