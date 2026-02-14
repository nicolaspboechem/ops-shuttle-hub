import { useState, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useServerTime } from '@/hooks/useServerTime';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CreateShuttleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated?: () => void;
}

export function CreateShuttleForm({ open, onOpenChange, eventoId, onCreated }: CreateShuttleFormProps) {
  const { userId } = useCurrentUser();
  const { pontosAtivos } = usePontosEmbarque(eventoId);
  const { getAgoraSync } = useServerTime();

  const [pontoEmbarqueId, setPontoEmbarqueId] = useState('');
  const [pontoDesembarqueId, setPontoDesembarqueId] = useState('');
  const [qtdPax, setQtdPax] = useState('');
  const [horario, setHorario] = useState(() => format(new Date(), 'HH:mm'));
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const pontoEmbarqueNome = useMemo(() => 
    pontosAtivos.find(p => p.id === pontoEmbarqueId)?.nome || null, 
    [pontosAtivos, pontoEmbarqueId]
  );
  const pontoDesembarqueNome = useMemo(() => 
    pontosAtivos.find(p => p.id === pontoDesembarqueId)?.nome || null, 
    [pontosAtivos, pontoDesembarqueId]
  );

  const canSave = pontoEmbarqueId && pontoDesembarqueId && qtdPax && Number(qtdPax) > 0;

  const resetForm = () => {
    setPontoEmbarqueId('');
    setPontoDesembarqueId('');
    setQtdPax('');
    setHorario(format(new Date(), 'HH:mm'));
    setObservacao('');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('viagens').insert({
        evento_id: eventoId,
        tipo_operacao: 'shuttle',
        motorista: 'Shuttle',
        status: 'em_andamento',
        h_pickup: horario,
        h_inicio_real: getAgoraSync().toISOString(),
        ponto_embarque: pontoEmbarqueNome,
        ponto_embarque_id: pontoEmbarqueId,
        ponto_desembarque: pontoDesembarqueNome,
        ponto_desembarque_id: pontoDesembarqueId,
        qtd_pax: Number(qtdPax),
        observacao: observacao.trim() || null,
        criado_por: userId,
      });

      if (error) throw error;

      toast.success('Shuttle registrado!');
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Novo Shuttle</DrawerTitle>
          <DrawerDescription>Registre uma viagem shuttle rápida</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Ponto de Embarque */}
          <div className="space-y-1.5">
            <Label>Ponto de Embarque</Label>
            <Select value={pontoEmbarqueId} onValueChange={setPontoEmbarqueId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o embarque" />
              </SelectTrigger>
              <SelectContent>
                {pontosAtivos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ponto de Desembarque */}
          <div className="space-y-1.5">
            <Label>Ponto de Desembarque</Label>
            <Select value={pontoDesembarqueId} onValueChange={setPontoDesembarqueId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o desembarque" />
              </SelectTrigger>
              <SelectContent>
                {pontosAtivos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PAX + Horário lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qtd PAX</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                value={qtdPax}
                onChange={e => setQtdPax(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário Embarque</Label>
              <Input
                type="time"
                value={horario}
                onChange={e => setHorario(e.target.value)}
              />
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Alguma informação extra..."
              rows={2}
            />
          </div>

          {/* Botão salvar */}
          <Button
            className="w-full"
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Registrar Shuttle
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
