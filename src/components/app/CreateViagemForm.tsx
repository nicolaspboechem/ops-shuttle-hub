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
import { QuickMotoristaForm } from './QuickMotoristaForm';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';

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
  const [placa, setPlaca] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState<string>('Van');
  const [pontoEmbarque, setPontoEmbarque] = useState('');
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
      setQtdPax('');
      setTipoOperacao('transfer');
      setObservacao('');
    }
  }, [open]);

  // Auto-preencher placa quando selecionar veículo
  const handleVeiculoChange = (value: string) => {
    setPlaca(value);
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
          detalhes: { motorista, placa, ponto_embarque: pontoEmbarque }
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
            {/* Motorista */}
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
              <Select value={motorista} onValueChange={setMotorista}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {activeMotoristas.map(m => (
                    <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Veículo/Placa */}
            <div className="space-y-2">
              <Label>Veículo/Placa</Label>
              <Select value={placa} onValueChange={handleVeiculoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou deixe em branco" />
                </SelectTrigger>
                <SelectContent>
                  {activeVeiculos.map(v => (
                    <SelectItem key={v.id} value={v.placa}>
                      {v.placa} - {v.tipo_veiculo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectValue placeholder="Selecione o ponto" />
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
