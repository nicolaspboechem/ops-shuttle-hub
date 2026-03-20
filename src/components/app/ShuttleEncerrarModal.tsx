import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServerTime } from '@/hooks/useServerTime';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle } from 'lucide-react';
import { Viagem } from '@/lib/types/viagem';

interface ShuttleEncerrarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viagem: Viagem | null;
  onEncerrado?: () => void;
}

export function ShuttleEncerrarModal({ open, onOpenChange, viagem, onEncerrado }: ShuttleEncerrarModalProps) {
  const { userId } = useCurrentUser();
  const { getAgoraSync } = useServerTime();

  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setObservacao('');
  };

  const handleEncerrar = async () => {
    if (!viagem) return;
    setSaving(true);

    try {
      const now = getAgoraSync();
      const agora = now.toISOString();
      const horaChegada = now.toTimeString().slice(0, 8);

      const { error } = await supabase.from('viagens').update({
        status: 'encerrado',
        encerrado: true,
        qtd_pax_retorno: 0,
        h_chegada: viagem.h_chegada || horaChegada,
        h_fim_real: agora,
        finalizado_por: userId,
        atualizado_por: userId,
        observacao: observacao || viagem.observacao,
      }).eq('id', viagem.id);

      if (error) throw error;

      toast.success('Viagem encerrada!');
      resetForm();
      onOpenChange(false);
      onEncerrado?.();
    } catch (err) {
      console.error('Erro ao encerrar shuttle:', err);
      toast.error('Erro ao encerrar viagem');
    } finally {
      setSaving(false);
    }
  };

  const nomeViagem = viagem?.coordenador || 'Shuttle';

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 justify-center">
            <CheckCircle className="h-5 w-5 text-primary" />
            Encerrar Viagem
          </DrawerTitle>
          <DrawerDescription className="truncate">{nomeViagem} • {viagem?.qtd_pax || 0} PAX ida</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-8 pt-2 space-y-5">

          {/* Observação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Observação</Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação opcional..."
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* Botão confirmar */}
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={saving}
            onClick={handleEncerrar}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Confirmar Encerramento
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
