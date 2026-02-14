import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
import { useMotoristas, useVeiculos } from '@/hooks/useCadastros';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useServerTime } from '@/hooks/useServerTime';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { Loader2, Bus, Car, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateViagemMotoristaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  motoristaName: string;
  onCreated: () => void;
  embedded?: boolean; // Renderizar inline ao invés de drawer
}

export function CreateViagemMotoristaForm({
  open,
  onOpenChange,
  eventoId,
  motoristaName,
  onCreated,
  embedded = false
}: CreateViagemMotoristaFormProps) {
  const { driverSession } = useDriverAuth();
  const { motoristas } = useMotoristas(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const { getAgoraSync } = useServerTime();

  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoEmbarqueOpen, setPontoEmbarqueOpen] = useState(false);
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [pontoDesembarqueOpen, setPontoDesembarqueOpen] = useState(false);
  const [qtdPax, setQtdPax] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState('transfer');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const activePontos = pontos.filter(p => p.ativo);

  // Encontrar veículo vinculado ao motorista
  const motoristaData = motoristas.find(m => 
    m.nome.toLowerCase() === motoristaName.toLowerCase()
  );
  const veiculoVinculado = motoristaData?.veiculo_id 
    ? veiculos.find(v => v.id === motoristaData.veiculo_id)
    : null;

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setPontoEmbarque('');
      setPontoDesembarque('');
      setQtdPax('');
      setTipoOperacao('transfer');
      setObservacao('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Proteção anti-duplicata (ref é síncrono, state pode ter delay)
    if (submittingRef.current) return;
    submittingRef.current = true;
    
    // Log de diagnóstico
    console.log('[CreateViagemMotoristaForm] Tentando criar viagem:', {
      eventoId,
      motoristaId: driverSession?.motorista_id,
      motoristaName,
      pontoEmbarque,
      pontoDesembarque,
      tipoOperacao,
      qtdPax,
      sessionValid: !!driverSession
    });
    
    // Validar sessão do motorista
    if (!driverSession?.motorista_id) {
      toast.error('Sessão expirada. Faça login novamente.');
      console.error('[CreateViagemMotoristaForm] Sessão inválida:', driverSession);
      submittingRef.current = false;
      return;
    }
    
    // Validações obrigatórias para motorista
    if (!pontoEmbarque) {
      toast.error('Selecione o ponto de embarque');
      submittingRef.current = false;
      return;
    }
    if (!pontoDesembarque) {
      toast.error('Selecione o ponto de desembarque');
      submittingRef.current = false;
      return;
    }
    if (!qtdPax || parseInt(qtdPax) <= 0) {
      toast.error('Informe a quantidade de passageiros');
      submittingRef.current = false;
      return;
    }

    setSaving(true);

    try {
      const agora = getAgoraSync();
      const horaPickup = agora.toTimeString().slice(0, 8);

      // Resolver IDs
      const pontoEmbarqueData = pontos.find(p => p.nome === pontoEmbarque);
      const pontoDesembarqueData = pontos.find(p => p.nome === pontoDesembarque);

      const { error } = await supabase
        .from('viagens')
        .insert([{
          evento_id: eventoId,
          // Campos FK normalizados
          motorista_id: motoristaData?.id || null,
          veiculo_id: veiculoVinculado?.id || null,
          ponto_embarque_id: pontoEmbarqueData?.id || null,
          ponto_desembarque_id: pontoDesembarqueData?.id || null,
          // Campos de texto (mantidos para compatibilidade)
          motorista: motoristaName,
          placa: veiculoVinculado?.placa || null,
          tipo_veiculo: veiculoVinculado?.tipo_veiculo || 'Van',
          ponto_embarque: pontoEmbarque,
          ponto_desembarque: pontoDesembarque,
          qtd_pax: parseInt(qtdPax),
          tipo_operacao: tipoOperacao,
          observacao: observacao || null,
          status: 'em_andamento',
          h_pickup: horaPickup,
          h_inicio_real: agora.toISOString(),
          iniciado_por: driverSession?.motorista_id || null,
          criado_por: driverSession?.motorista_id || null
        }]);

      if (error) {
        console.error('[CreateViagemMotoristaForm] Erro detalhado:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Erro ao criar viagem: ${error.message}`);
        return;
      }

      // Atualizar status do motorista para 'em_viagem' (para aparecer no localizador)
      if (motoristaData?.id) {
        await supabase
          .from('motoristas')
          .update({ status: 'em_viagem' })
          .eq('id', motoristaData.id);
      }

      // Registrar log
      const { data: viagemData } = await supabase
        .from('viagens')
        .select('id')
        .eq('evento_id', eventoId)
        .eq('motorista', motoristaName)
        .eq('h_pickup', horaPickup)
        .order('data_criacao', { ascending: false })
        .limit(1)
        .single();

      if (viagemData && driverSession?.motorista_id) {
        await supabase.from('viagem_logs').insert([{
          viagem_id: viagemData.id,
          user_id: driverSession.motorista_id,
          acao: 'inicio',
          detalhes: { 
            motorista: motoristaName, 
            placa: veiculoVinculado?.placa, 
            ponto_embarque: pontoEmbarque,
            ponto_desembarque: pontoDesembarque,
            criado_por_motorista: true
          }
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
      submittingRef.current = false;
    }
  };

  const VeiculoIcon = veiculoVinculado?.tipo_veiculo === 'Ônibus' ? Bus : Car;

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Motorista (readonly) */}
      <div className="space-y-2">
        <Label>Motorista</Label>
        <div className="p-3 rounded-md bg-muted text-sm font-medium">
          {motoristaName}
        </div>
      </div>

      {/* Veículo (readonly se vinculado) */}
      <div className="space-y-2">
        <Label>Veículo</Label>
        {veiculoVinculado ? (
          <div className="p-3 rounded-md bg-muted text-sm flex items-center gap-2">
            <VeiculoIcon className="h-4 w-4" />
            <span>{veiculoVinculado.placa} - {veiculoVinculado.tipo_veiculo}</span>
          </div>
        ) : (
          <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            Nenhum veículo vinculado
          </div>
        )}
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
        <Label>Ponto de Desembarque *</Label>
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

      {/* Quantidade de PAX e Tipo de Operação */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Qtd PAX *</Label>
          <Input
            type="number"
            value={qtdPax}
            onChange={e => setQtdPax(e.target.value)}
            placeholder="0"
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select value={tipoOperacao} onValueChange={setTipoOperacao}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          <SelectContent>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="shuttle">Shuttle</SelectItem>
              <SelectItem value="missao">Missão</SelectItem>
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
        {embedded ? (
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        ) : (
          <DrawerClose asChild>
            <Button type="button" variant="outline" className="flex-1">
              Cancelar
            </Button>
          </DrawerClose>
        )}
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
  );

  // Se embedded, renderizar diretamente
  if (embedded) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Nova Viagem</h2>
        {formContent}
      </div>
    );
  }

  // Senão, renderizar no Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle>Nova Viagem</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          {formContent}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
