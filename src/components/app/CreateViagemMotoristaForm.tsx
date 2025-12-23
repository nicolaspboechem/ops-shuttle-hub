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
import { toast } from 'sonner';
import { Loader2, Bus, Car } from 'lucide-react';

interface CreateViagemMotoristaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  motoristaName: string;
  onCreated: () => void;
}

export function CreateViagemMotoristaForm({
  open,
  onOpenChange,
  eventoId,
  motoristaName,
  onCreated
}: CreateViagemMotoristaFormProps) {
  const { user } = useAuth();
  const { pontos } = usePontosEmbarque(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { veiculos } = useVeiculos(eventoId);
  const { getAgoraSync } = useServerTime();

  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [qtdPax, setQtdPax] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState('transfer');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

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
    
    // Validações obrigatórias para motorista
    if (!pontoEmbarque) {
      toast.error('Selecione o ponto de embarque');
      return;
    }
    if (!pontoDesembarque) {
      toast.error('Selecione o ponto de desembarque');
      return;
    }
    if (!qtdPax || parseInt(qtdPax) <= 0) {
      toast.error('Informe a quantidade de passageiros');
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
        .eq('motorista', motoristaName)
        .eq('h_pickup', horaPickup)
        .order('data_criacao', { ascending: false })
        .limit(1)
        .single();

      if (viagemData) {
        await supabase.from('viagem_logs').insert([{
          viagem_id: viagemData.id,
          user_id: user?.id,
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
    }
  };

  const activePontos = pontos.filter(p => p.ativo);
  const VeiculoIcon = veiculoVinculado?.tipo_veiculo === 'Ônibus' ? Bus : Car;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle>Nova Viagem</DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
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
            <Label>Ponto de Desembarque *</Label>
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
  );
}
