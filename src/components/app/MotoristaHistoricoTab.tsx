import { useState, useMemo } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  LogOut,
  TrendingUp,
  Car,
  Target,
  Route,
  ArrowRightLeft
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Viagem } from '@/lib/types/viagem';
import { MotoristaPresencaComVeiculo } from '@/hooks/useMotoristaPresenca';
import { CheckoutModal } from './CheckoutModal';
import { DiaSeletor } from './DiaSeletor';
import { getDataOperacional, getLimitesDiaOperacional } from '@/lib/utils/diaOperacional';
import { useServerTime } from '@/hooks/useServerTime';

interface MotoristaHistoricoTabProps {
  viagensFinalizadas: Viagem[];
  presenca: MotoristaPresencaComVeiculo | null;
  onCheckout: (observacao?: string) => Promise<boolean>;
  loadingCheckout?: boolean;
  eventoId?: string;
  motoristaNome?: string;
  horarioVirada?: string;
  dataInicio?: string | null;
  dataFim?: string | null;
}

export function MotoristaHistoricoTab({ 
  viagensFinalizadas, 
  presenca,
  onCheckout,
  loadingCheckout,
  eventoId,
  motoristaNome,
  horarioVirada = '04:00',
  dataInicio,
  dataFim,
}: MotoristaHistoricoTabProps) {
  const { getAgoraSync } = useServerTime();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(() => 
    getDataOperacional(getAgoraSync(), horarioVirada)
  );

  const hasCheckin = !!presenca?.checkin_at;
  const hasCheckout = !!presenca?.checkout_at;
  const canCheckout = hasCheckin && !hasCheckout;

  // Filtrar viagens pela data selecionada
  const viagensDoDia = useMemo(() => {
    const limites = getLimitesDiaOperacional(dataSelecionada, horarioVirada);
    return viagensFinalizadas.filter(v => {
      const dataCriacao = new Date(v.data_criacao);
      return dataCriacao >= limites.inicio && dataCriacao <= limites.fim;
    });
  }, [viagensFinalizadas, dataSelecionada, horarioVirada]);

  const { visibleItems: viagensVisiveis, hasMore, loadMore, total: pTotal, pageSize: pSize, setPageSize: setPSize } = usePaginatedList(viagensDoDia, { defaultPageSize: 10 });

  // Calcular estatísticas do dia
  const estatisticas = useMemo(() => {
    const finalizadas = viagensDoDia.filter(v => v.status === 'encerrado');
    const canceladas = viagensDoDia.filter(v => v.status === 'cancelado');
    
    let totalPax = 0;
    let tempoTotalMinutos = 0;

    for (const viagem of finalizadas) {
      totalPax += (viagem.qtd_pax || 0) + (viagem.qtd_pax_retorno || 0);
      
      if (viagem.h_inicio_real && viagem.h_fim_real) {
        tempoTotalMinutos += differenceInMinutes(
          parseISO(viagem.h_fim_real),
          parseISO(viagem.h_inicio_real)
        );
      }
    }

    const horas = Math.floor(tempoTotalMinutos / 60);
    const minutos = tempoTotalMinutos % 60;
    const tempoFormatado = horas > 0 
      ? `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`
      : `${minutos}min`;

    return {
      finalizadas: finalizadas.length,
      canceladas: canceladas.length,
      totalPax,
      tempoEmRota: tempoFormatado
    };
  }, [viagensDoDia]);

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    if (time.includes('T')) {
      return format(parseISO(time), 'HH:mm');
    }
    return time.slice(0, 5);
  };

  const calcularDuracao = (viagem: Viagem): string => {
    if (!viagem.h_inicio_real || !viagem.h_fim_real) return '-';
    const minutos = differenceInMinutes(
      parseISO(viagem.h_fim_real),
      parseISO(viagem.h_inicio_real)
    );
    return `${minutos}min`;
  };

  const getViagemTipoBadge = (viagem: Viagem) => {
    if (viagem.observacao?.includes('Deslocamento:')) {
      return { label: 'Deslocamento', icon: Route, className: 'bg-teal-500/10 text-teal-600 border-teal-500/20' };
    }
    if (viagem.origem_missao_id) {
      return { label: 'Missão', icon: Target, className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
    }
    return { label: 'Transfer', icon: ArrowRightLeft, className: 'bg-primary/10 text-primary border-primary/20' };
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Data */}
      <DiaSeletor
        dataOperacional={dataSelecionada}
        onChange={setDataSelecionada}
        dataInicio={dataInicio}
        dataFim={dataFim}
        showToggleAll={false}
      />

      {/* Resumo do Dia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Resumo do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600">{estatisticas.finalizadas}</p>
              <p className="text-xs text-muted-foreground">Viagens Finalizadas</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-2xl font-bold text-primary">{estatisticas.totalPax}</p>
              <p className="text-xs text-muted-foreground">Total PAX</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted col-span-2">
              <p className="text-lg font-bold">{estatisticas.tempoEmRota}</p>
              <p className="text-xs text-muted-foreground">Tempo em Rota</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Viagens */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4" />
              Viagens do Dia
            </CardTitle>
            <Badge variant="secondary">{viagensDoDia.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {viagensVisiveis.length > 0 ? (
            <>
              {viagensVisiveis.map((viagem) => {
                const isEncerrado = viagem.status === 'encerrado';
                const isCancelado = viagem.status === 'cancelado';
                
                return (
                  <div 
                    key={viagem.id}
                    className={`p-3 rounded-lg border ${
                      isCancelado 
                        ? 'bg-destructive/5 border-destructive/20' 
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEncerrado ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <span className="font-medium text-sm">
                          {viagem.ponto_embarque || 'Origem'} → {viagem.ponto_desembarque || 'Destino'}
                        </span>
                        {(() => {
                          const tipoBadge = getViagemTipoBadge(viagem);
                          const TipoIcon = tipoBadge.icon;
                          return (
                            <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 ${tipoBadge.className}`}>
                              <TipoIcon className="h-2.5 w-2.5" />
                              {tipoBadge.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      <Badge variant={isEncerrado ? 'outline' : 'destructive'} className="text-xs shrink-0">
                        {isEncerrado ? 'Finalizada' : 'Cancelada'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(viagem.h_pickup)} - {formatTime(viagem.h_chegada)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {viagem.qtd_pax || 0} PAX
                      </span>
                      {isEncerrado && (
                        <span className="flex items-center gap-1">
                          ⏱ {calcularDuracao(viagem)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <LoadMoreFooter
                total={pTotal}
                visible={viagensVisiveis.length}
                hasMore={hasMore}
                onLoadMore={loadMore}
                pageSize={pSize}
                onPageSizeChange={setPSize}
              />
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma viagem finalizada neste dia</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de Checkout */}
      {canCheckout && (
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Ao encerrar o expediente, você não poderá mais realizar viagens hoje.
            </p>
            <Button 
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowCheckoutModal(true)}
              disabled={loadingCheckout}
            >
              <LogOut className="h-4 w-4" />
              Encerrar Expediente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status de expediente encerrado */}
      {hasCheckout && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Expediente encerrado</p>
              <p className="text-sm">
                Check-out às {presenca?.checkout_at ? format(parseISO(presenca.checkout_at), 'HH:mm') : '--:--'}
              </p>
              {presenca?.observacao_checkout && (
                <p className="mt-2 text-sm italic">"{presenca.observacao_checkout}"</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Checkout */}
      <CheckoutModal
        open={showCheckoutModal}
        onOpenChange={setShowCheckoutModal}
        presenca={presenca}
        viagensHoje={estatisticas.finalizadas}
        onConfirm={onCheckout}
        loading={loadingCheckout}
        eventoId={eventoId}
        motoristaNome={motoristaNome}
      />
    </div>
  );
}
