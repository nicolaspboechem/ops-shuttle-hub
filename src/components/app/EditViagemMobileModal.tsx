import { useState, useEffect } from 'react';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { Motorista, Veiculo } from '@/hooks/useCadastros';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Loader2, Save } from 'lucide-react';

interface EditViagemMobileModalProps {
  viagem: Viagem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onSave: () => void;
}

const statusOptions: { value: StatusViagemOperacao; label: string }[] = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'aguardando_retorno', label: 'Aguardando Retorno' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function EditViagemMobileModal({
  viagem,
  open,
  onOpenChange,
  eventoId,
  onSave,
}: EditViagemMobileModalProps) {
  const { user } = useAuth();
  const { pontos } = usePontosEmbarque(eventoId);
  
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    motorista_id: viagem.motorista_id || '',
    motorista: viagem.motorista || '',
    veiculo_id: viagem.veiculo_id || '',
    placa: viagem.placa || '',
    ponto_embarque_id: viagem.ponto_embarque_id || '',
    ponto_embarque: viagem.ponto_embarque || '',
    ponto_desembarque_id: viagem.ponto_desembarque_id || '',
    ponto_desembarque: viagem.ponto_desembarque || '',
    h_pickup: viagem.h_pickup || '',
    h_chegada: viagem.h_chegada || '',
    qtd_pax: viagem.qtd_pax?.toString() || '',
    qtd_pax_retorno: viagem.qtd_pax_retorno?.toString() || '',
    status: (viagem.status || 'agendado') as StatusViagemOperacao,
    observacao: viagem.observacao || '',
  });

  // Fetch motoristas and veiculos
  useEffect(() => {
    const fetchData = async () => {
      const [motoristasRes, veiculosRes] = await Promise.all([
        supabase
          .from('motoristas')
          .select('*')
          .eq('evento_id', eventoId)
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('veiculos')
          .select('*')
          .eq('evento_id', eventoId)
          .eq('ativo', true)
          .order('placa'),
      ]);

      if (motoristasRes.data) setMotoristas(motoristasRes.data);
      if (veiculosRes.data) setVeiculos(veiculosRes.data);
    };

    if (open) fetchData();
  }, [eventoId, open]);

  // Update motorista name when selection changes
  const handleMotoristaChange = (motoristaId: string) => {
    const motorista = motoristas.find(m => m.id === motoristaId);
    setFormData(prev => ({
      ...prev,
      motorista_id: motoristaId,
      motorista: motorista?.nome || prev.motorista,
      // Auto-fill veiculo if motorista has one
      veiculo_id: motorista?.veiculo_id || prev.veiculo_id,
      placa: veiculos.find(v => v.id === motorista?.veiculo_id)?.placa || prev.placa,
    }));
  };

  // Update placa when veiculo changes
  const handleVeiculoChange = (veiculoId: string) => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    setFormData(prev => ({
      ...prev,
      veiculo_id: veiculoId,
      placa: veiculo?.placa || prev.placa,
    }));
  };

  // Update ponto names when selection changes
  const handlePontoEmbarqueChange = (pontoId: string) => {
    const ponto = pontos.find(p => p.id === pontoId);
    setFormData(prev => ({
      ...prev,
      ponto_embarque_id: pontoId,
      ponto_embarque: ponto?.nome || prev.ponto_embarque,
    }));
  };

  const handlePontoDesembarqueChange = (pontoId: string) => {
    const ponto = pontos.find(p => p.id === pontoId);
    setFormData(prev => ({
      ...prev,
      ponto_desembarque_id: pontoId,
      ponto_desembarque: ponto?.nome || prev.ponto_desembarque,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    const updateData = {
      motorista_id: formData.motorista_id || null,
      motorista: formData.motorista,
      veiculo_id: formData.veiculo_id || null,
      placa: formData.placa || null,
      ponto_embarque_id: formData.ponto_embarque_id || null,
      ponto_embarque: formData.ponto_embarque || null,
      ponto_desembarque_id: formData.ponto_desembarque_id || null,
      ponto_desembarque: formData.ponto_desembarque || null,
      h_pickup: formData.h_pickup || null,
      h_chegada: formData.h_chegada || null,
      qtd_pax: formData.qtd_pax ? parseInt(formData.qtd_pax) : null,
      qtd_pax_retorno: formData.qtd_pax_retorno ? parseInt(formData.qtd_pax_retorno) : null,
      status: formData.status,
      observacao: formData.observacao || null,
      atualizado_por: user?.id,
    };

    const { error } = await supabase
      .from('viagens')
      .update(updateData)
      .eq('id', viagem.id);

    if (error) {
      toast.error('Erro ao salvar alterações');
      console.error(error);
    } else {
      toast.success('Viagem atualizada');
      onSave();
    }

    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Editar Viagem</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-20">
          {/* Motorista */}
          <div className="space-y-2">
            <Label>Motorista</Label>
            <Select
              value={formData.motorista_id}
              onValueChange={handleMotoristaChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar motorista" />
              </SelectTrigger>
              <SelectContent>
                {motoristas.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Veículo */}
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select
              value={formData.veiculo_id}
              onValueChange={handleVeiculoChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar veículo" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome ? `${v.nome} (${v.placa})` : v.placa} - {v.tipo_veiculo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pontos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Embarque</Label>
              <Select
                value={formData.ponto_embarque_id}
                onValueChange={handlePontoEmbarqueChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  {pontos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desembarque</Label>
              <Select
                value={formData.ponto_desembarque_id}
                onValueChange={handlePontoDesembarqueChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Destino" />
                </SelectTrigger>
                <SelectContent>
                  {pontos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>H. Pickup</Label>
              <Input
                type="time"
                value={formData.h_pickup}
                onChange={e => setFormData(prev => ({ ...prev, h_pickup: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>H. Chegada</Label>
              <Input
                type="time"
                value={formData.h_chegada}
                onChange={e => setFormData(prev => ({ ...prev, h_chegada: e.target.value }))}
              />
            </div>
          </div>

          {/* PAX */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>PAX Ida</Label>
              <Input
                type="number"
                value={formData.qtd_pax}
                onChange={e => setFormData(prev => ({ ...prev, qtd_pax: e.target.value }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>PAX Retorno</Label>
              <Input
                type="number"
                value={formData.qtd_pax_retorno}
                onChange={e => setFormData(prev => ({ ...prev, qtd_pax_retorno: e.target.value }))}
                min="0"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v: StatusViagemOperacao) => 
                setFormData(prev => ({ ...prev, status: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={formData.observacao}
              onChange={e => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              rows={3}
              placeholder="Observações..."
            />
          </div>
        </div>

        {/* Fixed save button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button 
            className="w-full h-12" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
