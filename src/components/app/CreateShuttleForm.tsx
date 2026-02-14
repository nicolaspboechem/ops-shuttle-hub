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
import { Loader2 } from 'lucide-react';

interface CreateShuttleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated?: () => void;
}

export function CreateShuttleForm({ open, onOpenChange, eventoId, onCreated }: CreateShuttleFormProps) {
  const { userId } = useCurrentUser();
  const { getAgoraSync } = useServerTime();

  const [qtdPax, setQtdPax] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = qtdPax && Number(qtdPax) > 0;

  const resetForm = () => {
    setQtdPax('');
    setObservacao('');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const agora = getAgoraSync().toISOString();
      const { error } = await supabase.from('viagens').insert({
        evento_id: eventoId,
        tipo_operacao: 'shuttle',
        motorista: 'Shuttle',
        status: 'encerrado',
        encerrado: true,
        qtd_pax: Number(qtdPax),
        observacao: observacao.trim() || null,
        criado_por: userId,
        h_inicio_real: agora,
        h_fim_real: agora,
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
          <DrawerDescription>Registre a quantidade de passageiros</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* PAX */}
          <div className="space-y-1.5">
            <Label>Quantidade de Passageiros (PAX)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={qtdPax}
              onChange={e => setQtdPax(e.target.value)}
              placeholder="0"
              className="text-2xl text-center h-14 font-bold"
              autoFocus
            />
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
