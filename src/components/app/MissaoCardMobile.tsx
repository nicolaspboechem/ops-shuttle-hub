import { Missao, MissaoPrioridade } from '@/hooks/useMissoes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Loader2, CheckCircle, XCircle, Play, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwipeableCard } from './SwipeableCard';

interface MissaoCardMobileProps {
  missao: Missao;
  loading?: boolean;
  onAceitar?: () => void;
  onRecusar?: () => void;
  onIniciar?: () => void;
  onFinalizar?: () => void;
}

const prioridadeConfig: Record<MissaoPrioridade, { label: string; className: string; cardBorder: string }> = {
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground', cardBorder: '' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary', cardBorder: '' },
  alta: { label: 'Alta', className: 'bg-amber-500/10 text-amber-600', cardBorder: 'border-amber-500/50' },
  urgente: { label: 'Urgente', className: 'bg-destructive/10 text-destructive animate-pulse', cardBorder: 'border-destructive/50 bg-destructive/5' },
};

const statusLabels: Record<string, string> = {
  pendente: 'Nova Missão',
  aceita: 'Aceita',
  em_andamento: 'Em Andamento',
};

export function MissaoCardMobile({ missao, loading, onAceitar, onRecusar, onIniciar, onFinalizar }: MissaoCardMobileProps) {
  const config = prioridadeConfig[missao.prioridade];

  // Swipe actions based on status
  const getSwipeActions = () => {
    if (missao.status === 'pendente') {
      return {
        leftAction: onRecusar ? {
          icon: <XCircle className="h-6 w-6" />,
          label: 'Recusar',
          color: 'text-white',
          bgColor: 'bg-destructive',
          action: onRecusar,
        } : undefined,
        rightAction: onAceitar ? {
          icon: <CheckCircle className="h-6 w-6" />,
          label: 'Aceitar',
          color: 'text-white',
          bgColor: 'bg-emerald-600',
          action: onAceitar,
        } : undefined,
      };
    }
    
    if (missao.status === 'aceita') {
      return {
        rightAction: onIniciar ? {
          icon: <Play className="h-6 w-6" />,
          label: 'Iniciar',
          color: 'text-white',
          bgColor: 'bg-blue-600',
          action: onIniciar,
        } : undefined,
      };
    }
    
    if (missao.status === 'em_andamento') {
      return {
        rightAction: onFinalizar ? {
          icon: <Flag className="h-6 w-6" />,
          label: 'Finalizar',
          color: 'text-white',
          bgColor: 'bg-emerald-600',
          action: onFinalizar,
        } : undefined,
      };
    }
    
    return {};
  };

  const swipeActions = getSwipeActions();

  const cardContent = (
    <Card className={cn(
      "transition-all",
      config.cardBorder,
      missao.status === 'pendente' && "border-primary/30 shadow-sm",
      missao.status === 'aceita' && "border-blue-500/30 bg-blue-500/5",
      missao.status === 'em_andamento' && "border-amber-500/30 bg-amber-500/5",
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {statusLabels[missao.status] || missao.status}
          </Badge>
        </div>

        {/* Título */}
        <h3 className="font-semibold text-lg mb-2">{missao.titulo}</h3>
        
        {/* Descrição */}
        {missao.descricao && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{missao.descricao}</p>
        )}

        {/* Rota */}
        {(missao.ponto_embarque || missao.ponto_desembarque) && (
          <div className="flex items-start gap-2 mb-3 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col">
              {missao.ponto_embarque && (
                <span><strong>De:</strong> {missao.ponto_embarque}</span>
              )}
              {missao.ponto_desembarque && (
                <span><strong>Para:</strong> {missao.ponto_desembarque}</span>
              )}
            </div>
          </div>
        )}

        {/* Horário */}
        {missao.horario_previsto && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            <span>Horário: <strong>{missao.horario_previsto.slice(0, 5)}</strong></span>
          </div>
        )}

        {/* Ações (botões como fallback/alternativa ao swipe) */}
        <div className="flex gap-2">
          {missao.status === 'pendente' && (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onRecusar}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Recusar
                  </>
                )}
              </Button>
              <Button
                className="flex-1"
                onClick={onAceitar}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar
                  </>
                )}
              </Button>
            </>
          )}

          {missao.status === 'aceita' && onIniciar && (
            <Button className="flex-1" onClick={onIniciar}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Missão
            </Button>
          )}

          {missao.status === 'em_andamento' && onFinalizar && (
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
              onClick={onFinalizar}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Finalizar Missão
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SwipeableCard
      leftAction={swipeActions.leftAction}
      rightAction={swipeActions.rightAction}
      disabled={loading}
    >
      {cardContent}
    </SwipeableCard>
  );
}
