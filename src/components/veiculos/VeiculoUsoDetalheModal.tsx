import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User, Phone, MessageSquare, Truck, Link, Unlink } from 'lucide-react';
import { VeiculoUsoRegistro } from '@/hooks/useVeiculoPresencaHistorico';

interface VeiculoUsoDetalheModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uso: VeiculoUsoRegistro | null;
  veiculoInfo: {
    placa: string;
    nome: string | null;
    tipo: string;
  } | null;
}

export function VeiculoUsoDetalheModal({
  open,
  onOpenChange,
  uso,
  veiculoInfo
}: VeiculoUsoDetalheModalProps) {
  if (!uso || !veiculoInfo) return null;

  const formatDateTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    try {
      return format(parseISO(timeStr), 'dd/MM HH:mm');
    } catch {
      return '--:--';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    return `${hours}h ${mins}min`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(`${dateStr}T12:00:00`), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Detalhes de Uso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Veículo Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{veiculoInfo.placa}</p>
                  {veiculoInfo.nome && (
                    <p className="text-sm text-muted-foreground">{veiculoInfo.nome}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {uso.em_uso && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Em uso
                    </Badge>
                  )}
                  <Badge variant="outline">{veiculoInfo.tipo}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="capitalize">{formatDate(uso.data)}</span>
          </div>

          {/* Motorista */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{uso.motorista_nome}</span>
            </div>
            {uso.motorista_telefone && (
              <div className="flex items-center gap-3 ml-8">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uso.motorista_telefone}</span>
              </div>
            )}
          </div>

          {/* Horários */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-green-600">
                  <Link className="w-4 h-4" />
                  <span className="text-sm font-medium">Vinculado em</span>
                </div>
                <span className="font-mono font-bold">{formatDateTime(uso.vinculado_em)}</span>
              </div>
              {uso.vinculado_por && (
                <div className="flex justify-between items-center ml-6">
                  <span className="text-xs text-muted-foreground">Por</span>
                  <span className="text-xs text-muted-foreground">{uso.vinculado_por}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-red-600">
                  <Unlink className="w-4 h-4" />
                  <span className="text-sm font-medium">Desvinculado em</span>
                </div>
                {uso.em_uso ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Em uso
                  </Badge>
                ) : (
                  <span className="font-mono font-bold">{formatDateTime(uso.desvinculado_em)}</span>
                )}
              </div>
              {uso.desvinculado_por && (
                <div className="flex justify-between items-center ml-6">
                  <span className="text-xs text-muted-foreground">Por</span>
                  <span className="text-xs text-muted-foreground">{uso.desvinculado_por}</span>
                </div>
              )}

              {!uso.em_uso && (
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Duração Total</span>
                  <Badge variant="secondary" className="font-mono">
                    {formatDuration(uso.duracao_minutos)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observação */}
          {uso.observacoes && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">
                      Observação de Desvinculação
                    </p>
                    <p className="text-sm">{uso.observacoes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
