import { Missao, MissaoPrioridade } from '@/hooks/useMissoes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Loader2, CheckCircle, Play, Flag, Calendar, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwipeableCard } from './SwipeableCard';


interface MissaoCardMobileProps {
  missao: Missao;
  loading?: boolean;
  disabled?: boolean;
  /** Data operacional calculada pelo pai (YYYY-MM-DD) */
  dataOperacional?: string;
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

/** Determina se a missão é instantânea ou agendada */
function getMissaoTipo(missao: Missao, dataOperacional?: string) {
  const hoje = dataOperacional || new Date().toISOString().slice(0, 10);
  const isHoje = !missao.data_programada || missao.data_programada === hoje;
  const temHorario = !!missao.horario_previsto;

  if (isHoje && !temHorario) {
    return { tipo: 'instantanea' as const, label: 'Instantânea', icon: Zap, className: 'bg-amber-500/10 text-amber-600' };
  }
  if (!isHoje && missao.data_programada) {
    const [, m, d] = missao.data_programada.split('-');
    return { tipo: 'agendada' as const, label: `Agendada ${d}/${m}`, icon: Calendar, className: 'bg-blue-500/10 text-blue-600' };
  }
  return { tipo: 'agendada' as const, label: 'Agendada', icon: Calendar, className: 'bg-blue-500/10 text-blue-600' };
}

export function MissaoCardMobile({ missao, loading, disabled, dataOperacional, onAceitar, onRecusar, onIniciar, onFinalizar }: MissaoCardMobileProps) {
  const config = prioridadeConfig[missao.prioridade];
  const tipoInfo = getMissaoTipo(missao, dataOperacional);
  const TipoIcon = tipoInfo.icon;

  // Swipe actions based on status
  const getSwipeActions = () => {
    if (missao.status === 'pendente') {
      return {
        rightAction: onAceitar && !disabled ? {
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
  const hoje = dataOperacional || new Date().toISOString().slice(0, 10);

  const cardContent = (
    <Card className={cn(
      "transition-all interactive-card",
      config.cardBorder,
      disabled && "opacity-60",
      missao.status === 'pendente' && !disabled && "border-primary/30 shadow-sm",
      missao.status === 'aceita' && "border-blue-500/30 bg-blue-500/5",
      missao.status === 'em_andamento' && "border-amber-500/30 bg-amber-500/5",
    )}
    data-tutorial="missao-card"
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
            <Badge variant="outline" className={cn("text-xs gap-1", tipoInfo.className)}>
              <TipoIcon className="h-3 w-3" />
              {tipoInfo.label}
            </Badge>
          </div>
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

        {/* Horário e Data */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {missao.data_programada && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {missao.data_programada === hoje
                  ? 'Hoje'
                  : missao.data_programada.split('-').reverse().slice(0, 2).join('/')}
              </span>
            </div>
          )}
          {missao.horario_previsto && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span><strong>{missao.horario_previsto.slice(0, 5)}</strong></span>
            </div>
          )}
        </div>


        {/* Ações */}
        <div className="flex gap-2">
          {missao.status === 'pendente' && (
            <Button
              className="flex-1"
              onClick={onAceitar}
              disabled={loading || disabled}
              variant={disabled ? "secondary" : "default"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : disabled ? (
                <span className="text-xs">Finalize a missão atual</span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aceitar Missão
                </>
              )}
            </Button>
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
      rightAction={swipeActions.rightAction}
      disabled={loading}
    >
      {cardContent}
    </SwipeableCard>
  );
}
