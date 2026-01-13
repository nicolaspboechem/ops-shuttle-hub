import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Clock, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MotoristaPresenca } from '@/hooks/useMotoristaPresenca';

interface CheckinCheckoutCardProps {
  presenca: MotoristaPresenca | null;
  onCheckin: () => Promise<boolean>;
  onCheckout: () => Promise<boolean>;
  loading?: boolean;
}

export function CheckinCheckoutCard({ 
  presenca, 
  onCheckin, 
  onCheckout, 
  loading 
}: CheckinCheckoutCardProps) {
  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const hasCheckin = !!presenca?.checkin_at;
  const hasCheckout = !!presenca?.checkout_at;

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground capitalize">{hoje}</p>
            <p className="font-semibold">Controle de Presença</p>
          </div>
          {hasCheckin && !hasCheckout && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Em serviço
            </span>
          )}
          {hasCheckout && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Clock className="h-3 w-3" />
              Expediente encerrado
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className={`text-lg font-bold ${hasCheckin ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {formatTime(presenca?.checkin_at ?? null)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground">Saída</p>
            <p className={`text-lg font-bold ${hasCheckout ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatTime(presenca?.checkout_at ?? null)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!hasCheckin && (
            <Button 
              className="flex-1 gap-2" 
              onClick={onCheckin}
              disabled={loading}
            >
              <LogIn className="h-4 w-4" />
              Check-in
            </Button>
          )}
          
          {hasCheckin && !hasCheckout && (
            <Button 
              variant="destructive" 
              className="flex-1 gap-2" 
              onClick={onCheckout}
              disabled={loading}
            >
              <LogOut className="h-4 w-4" />
              Check-out
            </Button>
          )}

          {hasCheckout && (
            <p className="text-sm text-center text-muted-foreground w-full py-2">
              Você já finalizou seu expediente de hoje.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
