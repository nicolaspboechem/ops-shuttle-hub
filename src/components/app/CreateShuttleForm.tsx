import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServerTime } from '@/hooks/useServerTime';
import { toast } from 'sonner';
import { Loader2, Bus } from 'lucide-react';

interface CreateShuttleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated?: () => void;
}

export function CreateShuttleForm({ open, onOpenChange, eventoId, onCreated }: CreateShuttleFormProps) {
  const { userId } = useCurrentUser();
  const { getAgoraSync } = useServerTime();

  const [nomeViagem, setNomeViagem] = useState('');
  const [qtdPax, setQtdPax] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = qtdPax && Number(qtdPax) > 0;

  const resetForm = () => {
    setNomeViagem('');
    setQtdPax('');
    setObservacao('');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const agora = getAgoraSync().toISOString();
      const horaAtual = getAgoraSync().toTimeString().slice(0, 5);

      // Shuttle não tem motorista real - motorista_id permanece null
      // O campo motorista='Shuttle' é texto fixo para identificação visual
      const { error } = await supabase.from('viagens').insert({
        evento_id: eventoId,
        tipo_operacao: 'shuttle',
        motorista: 'Shuttle', // Texto fixo - sem FK (shuttle não tem motorista)
        coordenador: nomeViagem.trim() || null,
        status: 'em_andamento',
        encerrado: false,
        qtd_pax: Number(qtdPax),
        observacao: observacao.trim() || null,
        criado_por: userId,
        h_inicio_real: agora,
        h_pickup: horaAtual,
      });

      if (error) throw error;

      toast.success('Shuttle iniciado!');
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
            Nova Viagem Shuttle
          </DrawerTitle>
          <DrawerDescription>Registre a ida do shuttle</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-8 pt-2 space-y-5">
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
