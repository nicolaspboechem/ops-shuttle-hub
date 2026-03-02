import { useState } from 'react';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
import { useUserNames } from '@/hooks/useUserNames';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  Play, 
  CheckCircle, 
  Loader2,
  XCircle,
  PauseCircle,
  UserPlus,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwipeableCard } from './SwipeableCard';
import { NavigationLinks } from './NavigationLinks';
import { ObservacaoUnificada } from '@/components/viagens/ObservacaoUnificada';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ViagemOperacoes {
  iniciarViagem: (viagem: Viagem) => Promise<boolean>;
  registrarChegada: (viagem: Viagem, qtdPax?: number, aguardarRetorno?: boolean, observacao?: string) => Promise<boolean>;
  encerrarViagem: (viagem: Viagem, observacao?: string) => Promise<boolean>;
  cancelarViagem: (viagem: Viagem, motivo?: string) => Promise<boolean>;
  iniciarRetorno: (viagem: Viagem) => Promise<any>;
  marcarRetorno: (viagem: Viagem, qtdPax: number, observacao?: string) => Promise<boolean>;
}

interface ViagemCardOperadorProps {
  viagem: Viagem & { veiculo?: { nome: string | null; placa: string; tipo_veiculo: string } | null };
  onUpdate: () => void;
  onTripStarted?: (origem?: string | null, destino?: string | null) => void;
  operacoes?: ViagemOperacoes;
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

export function ViagemCardOperador({ viagem, onUpdate, onTripStarted, operacoes }: ViagemCardOperadorProps) {
  const defaultOps = useViagemOperacao();
  const { iniciarViagem, registrarChegada, cancelarViagem, iniciarRetorno, encerrarViagem, marcarRetorno } = operacoes || defaultOps;
  
  const [loading, setLoading] = useState(false);
  const [showPaxDialog, setShowPaxDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [paxInput, setPaxInput] = useState('');
  const [retornarBase, setRetornarBase] = useState(false);
  const [observacao, setObservacao] = useState('');

  const status = (viagem.status || 'agendado') as StatusViagemOperacao;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const { getName } = useUserNames([viagem.criado_por, viagem.iniciado_por, viagem.finalizado_por]);

  // Nome do veículo (prioriza nome, fallback para placa)
  const nomeVeiculo = viagem.veiculo?.nome || viagem.placa;

  const handleIniciar = async () => {
    setLoading(true);
    const success = await iniciarViagem(viagem);
    onUpdate();
    setLoading(false);
    
    if (success && onTripStarted) {
      onTripStarted(viagem.ponto_embarque, viagem.ponto_desembarque);
    }
  };

  // Detectar se viagem já está retornando (viagem_pai_id === próprio id)
  const estaRetornando = viagem.viagem_pai_id === viagem.id;

  const handleChegada = () => {
    setPaxInput(viagem.qtd_pax?.toString() || '');
    setRetornarBase(viagem.tipo_operacao === 'shuttle' && !estaRetornando);
    setObservacao('');
    setShowPaxDialog(true);
  };

  const confirmChegada = async () => {
    setLoading(true);
    setShowPaxDialog(false);
    
    const pax = paxInput ? parseInt(paxInput) : 0;
    
    if (viagem.tipo_operacao === 'shuttle' && retornarBase && !estaRetornando) {
      // Marcar retorno na mesma viagem (inverte pontos, mantém em_andamento)
      await marcarRetorno(viagem, pax, observacao || undefined);
    } else {
      // Encerra direto (sem standby)
      await registrarChegada(viagem, pax, false, observacao || undefined);
    }
    
    onUpdate();
    setLoading(false);
  };

  const handleIniciarRetorno = async () => {
    setLoading(true);
    await iniciarRetorno(viagem);
    onUpdate();
    setLoading(false);
  };

  const handleEncerrar = async () => {
    setLoading(true);
    await encerrarViagem(viagem);
    onUpdate();
    setLoading(false);
  };

  const handleCancelar = () => {
    setShowCancelDialog(true);
  };

  const confirmCancelar = async () => {
    setShowCancelDialog(false);
    setLoading(true);
    await cancelarViagem(viagem);
    onUpdate();
    setLoading(false);
  };

  // Swipe actions based on status
  const getSwipeActions = () => {
    if (status === 'agendado') {
      return {
        leftAction: {
          icon: <XCircle className="h-6 w-6" />,
          label: 'Cancelar',
          color: 'text-white',
          bgColor: 'bg-destructive',
          action: handleCancelar,
        },
        rightAction: {
          icon: <Play className="h-6 w-6" />,
          label: 'Iniciar',
          color: 'text-white',
          bgColor: 'bg-blue-600',
          action: handleIniciar,
        },
      };
    }
    
    if (status === 'em_andamento') {
      return {
        leftAction: undefined,
        rightAction: {
          icon: <CheckCircle className="h-6 w-6" />,
          label: 'Chegou',
          color: 'text-white',
          bgColor: 'bg-amber-600',
          action: handleChegada,
        },
      };
    }
    
    if (status === 'aguardando_retorno' && viagem.tipo_operacao === 'shuttle') {
      return {
        leftAction: {
          icon: <RotateCcw className="h-6 w-6" />,
          label: 'Retorno',
          color: 'text-white',
          bgColor: 'bg-blue-600',
          action: handleIniciarRetorno,
        },
        rightAction: {
          icon: <CheckCircle className="h-6 w-6" />,
          label: 'Concluir',
          color: 'text-white',
          bgColor: 'bg-emerald-600',
          action: handleEncerrar,
        },
      };
    }
    
    if (status === 'aguardando_retorno') {
      return {
        leftAction: undefined,
        rightAction: {
          icon: <CheckCircle className="h-6 w-6" />,
          label: 'Encerrar',
          color: 'text-white',
          bgColor: 'bg-emerald-600',
          action: handleEncerrar,
        },
      };
    }
    
    return { leftAction: undefined, rightAction: undefined };
  };

  const swipeActions = getSwipeActions();

  return (
    <>
      <SwipeableCard
        leftAction={swipeActions.leftAction}
        rightAction={swipeActions.rightAction}
        disabled={loading || status === 'encerrado' || status === 'cancelado'}
      >
        <Card className={cn(
          "transition-all",
          status === 'em_andamento' && "border-blue-500/50 bg-blue-500/5",
          status === 'encerrado' && "opacity-70",
          status === 'cancelado' && "opacity-50"
        )}>
        <CardContent className="p-4">
          {/* Header: Status e Tipo */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className={config.className}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <Badge variant="secondary">
              {viagem.tipo_veiculo === 'Ônibus' ? '🚌' : '🚐'} {viagem.tipo_operacao}
            </Badge>
          </div>

          {/* Motorista e Veículo */}
          <div className="flex items-center gap-2 mb-2">
            <Bus className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{viagem.motorista}</span>
            {viagem.veiculo?.nome ? (
              <span className="text-muted-foreground">
                • <span className="font-medium text-foreground">{viagem.veiculo.nome}</span>
                {viagem.placa && <span className="text-xs ml-1">({viagem.placa})</span>}
              </span>
            ) : viagem.placa ? (
              <span className="text-muted-foreground">• {viagem.placa}</span>
            ) : null}
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

          {/* Links de Navegação */}
          <NavigationLinks 
            origem={viagem.ponto_embarque}
            destino={viagem.ponto_desembarque}
            compact
          />

          {/* Observação */}
          <ObservacaoUnificada
            observacaoInicial={viagem.observacao}
            onSave={async (novaObs) => {
              const { error } = await supabase
                .from('viagens')
                .update({ observacao: novaObs })
                .eq('id', viagem.id);
              if (error) {
                toast.error('Erro ao salvar observação');
              } else {
                toast.success('Observação salva');
                onUpdate();
              }
            }}
          />

          {/* Auditoria */}
          {(viagem.criado_por || viagem.iniciado_por || viagem.finalizado_por) && (
            <div className="border-t pt-2 mb-3 text-xs text-muted-foreground space-y-0.5">
              {viagem.criado_por && (
                <div className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  <span>Criado: {getName(viagem.criado_por)}</span>
                </div>
              )}
              {viagem.iniciado_por && (
                <div className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  <span>Iniciado: {getName(viagem.iniciado_por)}</span>
                </div>
              )}
              {viagem.finalizado_por && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Encerrado: {getName(viagem.finalizado_por)}</span>
                </div>
              )}
            </div>
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

            {/* Shuttle em standby: pode iniciar retorno ou encerrar */}
            {status === 'aguardando_retorno' && viagem.tipo_operacao === 'shuttle' && (
              <div className="flex gap-2 w-full">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                  onClick={handleEncerrar}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleIniciarRetorno}
                  disabled={loading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Outros tipos em standby (missão/transfer): apenas encerrar */}
            {status === 'aguardando_retorno' && viagem.tipo_operacao !== 'shuttle' && (
              <Button 
                variant="outline"
                className="flex-1" 
                onClick={handleEncerrar}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Encerrar
                  </>
                )}
              </Button>
            )}

            {status === 'encerrado' && (
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
    </SwipeableCard>

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

            {/* Opção de retornar à base apenas para Shuttle (e se não está já retornando) */}
            {viagem.tipo_operacao === 'shuttle' && !estaRetornando && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                <Checkbox 
                  id="retornarBase" 
                  checked={retornarBase}
                  onCheckedChange={(checked) => setRetornarBase(checked === true)}
                />
                <label htmlFor="retornarBase" className="text-sm cursor-pointer">
                  Retornar à base
                </label>
              </div>
            )}

            {/* Campo de observação */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação</label>
              <Textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Observação opcional..."
                className="min-h-[60px] text-sm"
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
                {viagem.tipo_operacao === 'shuttle' && retornarBase && !estaRetornando 
                  ? 'Confirmar e Retornar' 
                  : 'Encerrar Viagem'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar viagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A viagem de <strong>{viagem.motorista}</strong> será marcada como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelar} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Viagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
