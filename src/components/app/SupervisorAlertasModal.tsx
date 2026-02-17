import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fuel, MapPin, Clock, CheckCircle, Loader2, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertaFrota } from '@/hooks/useAlertasFrota';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SupervisorAlertasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertas: AlertaFrota[];
  onAtualizarStatus: (alertaId: string, status: string) => Promise<void>;
}

const nivelConfig: Record<string, { label: string; color: string }> = {
  vazio: { label: 'Vazio', color: 'bg-destructive text-destructive-foreground' },
  '1/4': { label: '1/4', color: 'bg-orange-500 text-white' },
  '1/2': { label: '1/2', color: 'bg-yellow-500 text-yellow-950' },
  '3/4': { label: '3/4', color: 'bg-emerald-500 text-white' },
  cheio: { label: 'Cheio', color: 'bg-emerald-500 text-white' },
};

export function SupervisorAlertasModal({
  open,
  onOpenChange,
  alertas,
  onAtualizarStatus,
}: SupervisorAlertasModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      await onAtualizarStatus(id, status);
      toast.success(status === 'pendente' ? 'Marcado como pendente' : 'Alerta resolvido!');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setLoadingId(null);
    }
  };

  const handleManutencao = async (alerta: AlertaFrota) => {
    setLoadingId(alerta.id);
    try {
      await supabase.from('veiculos').update({ status: 'em_manutencao' }).eq('id', alerta.veiculo_id);
      await onAtualizarStatus(alerta.id, 'resolvido');
      toast.success('Veículo enviado para manutenção');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-destructive" />
            Alertas de Combustível
            <Badge variant="destructive">{alertas.length}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 flex-1 min-h-0 overflow-y-auto pb-4">
          {alertas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Fuel className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum alerta ativo</p>
            </div>
          ) : (
            alertas.map((alerta) => {
              const nivel = nivelConfig[alerta.nivel_combustivel || ''] || { label: alerta.nivel_combustivel, color: 'bg-muted' };
              return (
                <div key={alerta.id} className="p-4 rounded-xl border bg-card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">{alerta.veiculo?.nome || alerta.veiculo?.placa || '---'}</span>
                        {alerta.veiculo?.nome && alerta.veiculo?.placa && (
                          <span className="text-xs text-muted-foreground">({alerta.veiculo.placa})</span>
                        )}
                        <Badge className={nivel.color}>{nivel.label}</Badge>
                        {alerta.status === 'pendente' && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-400">Pendente</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alerta.motorista?.nome || 'Motorista'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(alerta.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>

                  {alerta.observacao && (
                    <p className="text-sm bg-muted/50 p-2 rounded-lg italic">
                      "{alerta.observacao}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {alerta.status === 'aberto' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={loadingId === alerta.id}
                        onClick={() => handleAction(alerta.id, 'pendente')}
                      >
                        {loadingId === alerta.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                        Base
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={loadingId === alerta.id}
                      onClick={() => handleManutencao(alerta)}
                    >
                      {loadingId === alerta.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />}
                      Manutenção
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      disabled={loadingId === alerta.id}
                      onClick={() => handleAction(alerta.id, 'resolvido')}
                    >
                      {loadingId === alerta.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Resolver
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
