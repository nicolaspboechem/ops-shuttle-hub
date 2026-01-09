import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RetornoViagemForm } from './RetornoViagemForm';
import { 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  Play, 
  CheckCircle, 
  ArrowRight,
  Loader2,
  XCircle,
  PauseCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViagemCardOperadorProps {
  viagem: Viagem;
  onUpdate: () => void;
}

const statusConfig: Record<StatusViagemOperacao, { label: string; className: string; icon: React.ElementType }> = {
  agendado: { 
    label: 'Agendado', 
    className: 'bg-muted text-muted-foreground',
    icon: Clock
  },
  em_andamento: { 
    label: 'Em Andamento', 
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    icon: Bus
  },
  aguardando_retorno: { 
    label: 'Standby', 
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: PauseCircle
  },
  encerrado: { 
    label: 'Encerrado', 
    className: 'bg-green-500/10 text-green-600 border-green-500/30',
    icon: CheckCircle
  },
  cancelado: { 
    label: 'Cancelado', 
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: XCircle
  }
};

export function ViagemCardOperador({ viagem, onUpdate }: ViagemCardOperadorProps) {
  const { eventoId } = useParams();
  const { isAdmin, getEventRole } = useAuth();
  const { iniciarViagem, registrarChegada, cancelarViagem } = useViagemOperacao();
  
  const [loading, setLoading] = useState(false);
  const [showPaxDialog, setShowPaxDialog] = useState(false);
  const [showRetornoForm, setShowRetornoForm] = useState(false);
  const [paxInput, setPaxInput] = useState('');

  const status = (viagem.status || 'agendado') as StatusViagemOperacao;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Verificar permissão para iniciar retorno
  const role = eventoId ? getEventRole(eventoId) : null;
  const canInitiateReturn = isAdmin || role === 'operador';

  // Verificar se a viagem foi encerrada recentemente (últimas 4 horas)
  const isRecentlyCompleted = () => {
    if (status !== 'encerrado' || !viagem.h_fim_real) return false;
    const completedAt = new Date(viagem.h_fim_real);
    const now = new Date();
    const hoursDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 4;
  };

  const showReturnButton = canInitiateReturn && isRecentlyCompleted();

  const handleIniciar = async () => {
    setLoading(true);
    await iniciarViagem(viagem);
    onUpdate();
    setLoading(false);
  };

  const handleChegada = () => {
    setPaxInput(viagem.qtd_pax?.toString() || '');
    setShowPaxDialog(true);
  };

  const confirmChegada = async () => {
    setLoading(true);
    setShowPaxDialog(false);
    
    const pax = paxInput ? parseInt(paxInput) : undefined;
    await registrarChegada(viagem, pax);
    
    onUpdate();
    setLoading(false);
  };

  const handleCancelar = async () => {
    if (!confirm('Cancelar esta viagem?')) return;
    setLoading(true);
    await cancelarViagem(viagem);
    onUpdate();
    setLoading(false);
  };

  const handleRetorno = () => {
    setShowRetornoForm(true);
  };

  return (
    <>
      <Card className={cn(
        "transition-all",
        status === 'em_andamento' && "border-blue-500/50 bg-blue-500/5",
        status === 'encerrado' && showReturnButton && "border-amber-500/30 bg-amber-500/5",
        status === 'encerrado' && !showReturnButton && "opacity-70",
        status === 'cancelado' && "opacity-50"
      )}>
        <CardContent className="p-4">
          {/* Header: Status e Tipo */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={config.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {showReturnButton && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Disponível
                </Badge>
              )}
            </div>
            <Badge variant="secondary">
              {viagem.tipo_veiculo === 'Ônibus' ? '🚌' : '🚐'} {viagem.tipo_operacao}
            </Badge>
          </div>

          {/* Motorista e Placa */}
          <div className="flex items-center gap-2 mb-2">
            <Bus className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{viagem.motorista}</span>
            {viagem.placa && (
              <span className="text-muted-foreground">• {viagem.placa}</span>
            )}
          </div>

          {/* Ponto de Embarque e Desembarque */}
          <div className="flex flex-col gap-1 mb-2 text-sm">
            {viagem.ponto_embarque && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-green-600" />
                <span><strong>De:</strong> {viagem.ponto_embarque}</span>
              </div>
            )}
            {viagem.ponto_desembarque && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-red-600" />
                <span><strong>Para:</strong> {viagem.ponto_desembarque}</span>
              </div>
            )}
          </div>

          {/* PAX e Horários */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{viagem.qtd_pax || 0} PAX</span>
            </div>
            {viagem.h_pickup && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Pickup: {viagem.h_pickup?.slice(0, 5)}</span>
              </div>
            )}
            {viagem.h_chegada && (
              <div className="text-muted-foreground">
                Chegou: {viagem.h_chegada?.slice(0, 5)}
              </div>
            )}
          </div>

          {/* Observação */}
          {viagem.observacao && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {viagem.observacao}
            </p>
          )}

          {/* Ações baseadas no status */}
          <div className="flex gap-2">
            {status === 'agendado' && (
              <>
                <Button 
                  className="flex-1" 
                  onClick={handleIniciar}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleCancelar}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}

            {status === 'em_andamento' && (
              <Button 
                className="flex-1 bg-amber-600 hover:bg-amber-700" 
                onClick={handleChegada}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Chegou ao Destino
                  </>
                )}
              </Button>
            )}

            {status === 'encerrado' && showReturnButton && (
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90" 
                onClick={handleRetorno}
                disabled={loading}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Iniciar Retorno
              </Button>
            )}

            {status === 'encerrado' && !showReturnButton && (
              <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                {viagem.h_chegada && <>Chegada: {viagem.h_chegada?.slice(0, 5)}</>}
              </div>
            )}

            {status === 'cancelado' && (
              <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                Viagem cancelada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para confirmar PAX na chegada */}
      <Dialog open={showPaxDialog} onOpenChange={setShowPaxDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirmar Chegada</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Quantidade de Passageiros
              </label>
              <Input
                type="number"
                value={paxInput}
                onChange={e => setPaxInput(e.target.value)}
                placeholder="0"
                min="0"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPaxDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={confirmChegada} className="flex-1">
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form de Retorno */}
      <RetornoViagemForm
        open={showRetornoForm}
        onOpenChange={setShowRetornoForm}
        viagemOriginal={viagem}
        onSuccess={onUpdate}
      />
    </>
  );
}
