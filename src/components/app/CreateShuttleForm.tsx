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
import { Loader2, Users } from 'lucide-react';

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
    <Drawer open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 justify-center">
            <Users className="h-5 w-5 text-primary" />
            Novo Shuttle
          </DrawerTitle>
          <DrawerDescription>Registre a quantidade de passageiros</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-8 pt-2 space-y-5">
          {/* PAX - campo principal grande e claro */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Passageiros (PAX)</Label>
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
            Registrar Shuttle
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
