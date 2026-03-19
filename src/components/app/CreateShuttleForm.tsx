import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServerTime } from '@/hooks/useServerTime';
import { toast } from 'sonner';
import { Loader2, Bus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Veiculo {
  id: string;
  placa: string;
  nome?: string | null;
  tipo_veiculo: string;
  ativo: boolean;
}

interface PontoEmbarque {
  id: string;
  nome: string;
  ativo: boolean;
}

interface CreateShuttleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated?: () => void;
  veiculos?: Veiculo[];
  pontos?: PontoEmbarque[];
  /** 'rapido' = cria em_andamento (ida+volta direto), 'completo' = cria agendado (ciclo completo) */
  mode?: 'rapido' | 'completo';
}

export function CreateShuttleForm({ open, onOpenChange, eventoId, onCreated, veiculos = [], pontos = [], mode = 'rapido' }: CreateShuttleFormProps) {
  const { userId } = useCurrentUser();
  const { getAgoraSync } = useServerTime();

  const [nomeViagem, setNomeViagem] = useState('');
  const [qtdPax, setQtdPax] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  // New fields
  const [veiculoId, setVeiculoId] = useState('');
  const [veiculoOpen, setVeiculoOpen] = useState(false);
  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoEmbarqueOpen, setPontoEmbarqueOpen] = useState(false);
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [pontoDesembarqueOpen, setPontoDesembarqueOpen] = useState(false);

  const canSave = qtdPax && Number(qtdPax) > 0;

  const activeVeiculos = veiculos.filter(v => v.ativo);
  const activePontos = pontos.filter(p => p.ativo);

  const selectedVeiculo = activeVeiculos.find(v => v.id === veiculoId);

  const resetForm = () => {
    setNomeViagem('');
    setQtdPax('');
    setObservacao('');
    setVeiculoId('');
    setPontoEmbarque('');
    setPontoDesembarque('');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const agora = getAgoraSync().toISOString();
      const horaAtual = getAgoraSync().toTimeString().slice(0, 5);

      const pontoEmbarqueData = activePontos.find(p => p.nome === pontoEmbarque);
      const pontoDesembarqueData = activePontos.find(p => p.nome === pontoDesembarque);

      const isRapido = mode === 'rapido';

      const { error } = await supabase.from('viagens').insert({
        evento_id: eventoId,
        tipo_operacao: 'shuttle',
        motorista: 'Shuttle',
        coordenador: nomeViagem.trim() || null,
        status: isRapido ? 'em_andamento' : 'agendado',
        encerrado: false,
        qtd_pax: Number(qtdPax),
        observacao: observacao.trim() || null,
        criado_por: userId,
        h_inicio_real: isRapido ? agora : null,
        h_pickup: isRapido ? horaAtual : null,
        veiculo_id: veiculoId || null,
        ponto_embarque: pontoEmbarque || null,
        ponto_desembarque: pontoDesembarque || null,
        ponto_embarque_id: pontoEmbarqueData?.id || null,
        ponto_desembarque_id: pontoDesembarqueData?.id || null,
      });

      if (error) throw error;

      toast.success(mode === 'rapido' ? 'Shuttle iniciado!' : 'Shuttle agendado!');
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      console.error('Erro ao criar shuttle:', err);
      toast.error('Erro ao registrar shuttle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 justify-center">
            <Bus className="h-5 w-5 text-primary" />
            {mode === 'rapido' ? 'Shuttle Rápido' : 'Shuttle Completo'}
          </DrawerTitle>
          <DrawerDescription>
            {mode === 'rapido' ? 'Registre ida e volta direto' : 'Crie o shuttle com ciclo completo de etapas'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-8 pt-2 space-y-4 overflow-y-auto">
          {/* Nome da viagem */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome da viagem <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              value={nomeViagem}
              onChange={e => setNomeViagem(e.target.value)}
              placeholder="Ex: Hotel → Evento"
              className="h-12 text-base"
            />
          </div>

          {/* Veículo */}
          {activeVeiculos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Veículo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Popover open={veiculoOpen} onOpenChange={setVeiculoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-12"
                  >
                    {selectedVeiculo
                      ? `${selectedVeiculo.nome || selectedVeiculo.placa} - ${selectedVeiculo.tipo_veiculo}`
                      : "Selecionar veículo..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar veículo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activeVeiculos.map((v) => (
                          <CommandItem
                            key={v.id}
                            value={`${v.nome || ''} ${v.placa}`}
                            onSelect={() => {
                              setVeiculoId(v.id === veiculoId ? '' : v.id);
                              setVeiculoOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", veiculoId === v.id ? "opacity-100" : "opacity-0")} />
                            {v.nome || v.placa} - {v.tipo_veiculo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Ponto A (Origem) */}
          {activePontos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Origem (Ponto A) <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Popover open={pontoEmbarqueOpen} onOpenChange={setPontoEmbarqueOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-12">
                    {pontoEmbarque || "Selecionar ponto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar ponto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum ponto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activePontos.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.nome}
                            onSelect={() => {
                              setPontoEmbarque(p.nome === pontoEmbarque ? '' : p.nome);
                              setPontoEmbarqueOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", pontoEmbarque === p.nome ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Ponto B (Destino) */}
          {activePontos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destino (Ponto B) <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Popover open={pontoDesembarqueOpen} onOpenChange={setPontoDesembarqueOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-12">
                    {pontoDesembarque || "Selecionar ponto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar ponto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum ponto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activePontos.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.nome}
                            onSelect={() => {
                              setPontoDesembarque(p.nome === pontoDesembarque ? '' : p.nome);
                              setPontoDesembarqueOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", pontoDesembarque === p.nome ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* PAX de ida */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Passageiros (ida)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={qtdPax}
              onChange={e => setQtdPax(e.target.value)}
              placeholder="0"
              className="text-3xl text-center h-16 font-bold tracking-wider"
              autoFocus
            />
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Alguma informação extra..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Botão salvar */}
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Iniciar Shuttle
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
