import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, Clock, CheckCircle2, Car, AlertTriangle, Fuel, Eye, Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MotoristaPresencaComVeiculo } from '@/hooks/useMotoristaPresenca';
import { Veiculo } from '@/hooks/useCadastros';
import { useServerTime } from '@/hooks/useServerTime';
import { CheckoutModal } from './CheckoutModal';
import { VistoriaConfirmModal } from './VistoriaConfirmModal';
import { VeiculoFotosModal } from './VeiculoFotosModal';

interface CheckinCheckoutCardProps {
  presenca: MotoristaPresencaComVeiculo | null;
  veiculoAtribuido: Veiculo | null;
  onCheckin: () => Promise<boolean>;
  onCheckout: (observacao?: string) => Promise<boolean>;
  loading?: boolean;
  viagensHoje?: number;
  hideCheckout?: boolean; // Ocultar botão de checkout (usado quando está na aba de histórico)
}

export function CheckinCheckoutCard({ 
  presenca, 
  veiculoAtribuido,
  onCheckin, 
  onCheckout, 
  loading,
  viagensHoje = 0,
  hideCheckout = false
}: CheckinCheckoutCardProps) {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showVistoriaModal, setShowVistoriaModal] = useState(false);
  const [showFotosModal, setShowFotosModal] = useState(false);
  const { getAgoraSync } = useServerTime();
  const hoje = format(getAgoraSync(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const hasCheckin = !!presenca?.checkin_at;
  const hasCheckout = !!presenca?.checkout_at;

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  // Veículo a exibir: do check-in de hoje ou o atualmente atribuído
  const veiculoExibir = presenca?.veiculo || veiculoAtribuido;

  const getNivelCombustivelLabel = (nivel: string | null | undefined) => {
    const niveis: Record<string, string> = {
      'vazio': '🔴 Vazio',
      '1/4': '🟠 1/4',
      '1/2': '🟡 1/2',
      '3/4': '🟢 3/4',
      'cheio': '🟢 Cheio'
    };
    return niveis[nivel || ''] || nivel || '-';
  };

  // Estado ANTES do check-in: mostrar veículo atribuído
  if (!hasCheckin) {
    return (
      <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground capitalize">{hoje}</p>
              <p className="font-semibold">Iniciar Expediente</p>
            </div>
          </div>

          {/* Veículo atribuído */}
          {veiculoAtribuido ? (
            <div className="space-y-3 mb-4">
              <div className="p-3 rounded-lg bg-background/80 border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-medium">Veículo Atribuído</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {veiculoAtribuido.tipo_veiculo}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <code className="text-lg font-bold">{veiculoAtribuido.placa}</code>
                  {veiculoAtribuido.nome && (
                    <span className="text-sm text-muted-foreground">
                      ({veiculoAtribuido.nome})
                    </span>
                  )}
                </div>

                {/* Informações da última inspeção */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-sm">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Combustível:</span>
                    <span>{getNivelCombustivelLabel(veiculoAtribuido.nivel_combustivel)}</span>
                  </div>
                  {veiculoAtribuido.inspecao_data && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Vistoria:</span>
                      <span>{format(parseISO(veiculoAtribuido.inspecao_data), 'dd/MM HH:mm')}</span>
                    </div>
                  )}
                </div>

                {/* Alerta de avarias */}
                {veiculoAtribuido.possui_avarias && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-amber-600 dark:text-amber-400">
                      Veículo possui avarias registradas. Verifique antes de iniciar.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed mb-4 text-center">
              <Car className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum veículo atribuído
              </p>
              <p className="text-xs text-muted-foreground">
                Aguarde a atribuição pela coordenação
              </p>
            </div>
          )}

          <Button 
            className="w-full gap-2" 
            onClick={() => setShowVistoriaModal(true)}
            disabled={loading || !veiculoAtribuido}
          >
            <LogIn className="h-4 w-4" />
            Verificar e Fazer Check-in
          </Button>
        </CardContent>
      </Card>

      <VistoriaConfirmModal
        open={showVistoriaModal}
        onOpenChange={setShowVistoriaModal}
        veiculo={veiculoAtribuido}
        onConfirm={onCheckin}
        loading={loading}
      />
    </>
    );
  }

  // Estado DURANTE o expediente
  if (hasCheckin && !hasCheckout) {
    return (
      <>
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground capitalize">{hoje}</p>
                <p className="font-semibold">Controle de Presença</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Em serviço
              </span>
            </div>

            {/* Veículo em uso */}
            {veiculoExibir && (
              <div className="p-3 rounded-lg bg-background/80 border mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Veículo em uso:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="font-bold">{veiculoExibir.placa}</code>
                    {veiculoExibir.nome && (
                      <span className="text-sm text-muted-foreground">
                        ({veiculoExibir.nome})
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Botão Ver Fotos */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowFotosModal(true)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Ver Fotos do Veículo
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Entrada</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatTime(presenca?.checkin_at ?? null)}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Saída</p>
                <p className="text-lg font-bold text-muted-foreground">
                  --:--
                </p>
              </div>
            </div>

            {/* Botão de checkout - só mostra se hideCheckout for false */}
            {!hideCheckout && (
              <Button 
                variant="destructive" 
                className="w-full gap-2" 
                onClick={() => setShowCheckoutModal(true)}
                disabled={loading}
              >
                <LogOut className="h-4 w-4" />
                Encerrar Expediente
              </Button>
            )}
          </CardContent>
        </Card>

        <CheckoutModal
          open={showCheckoutModal}
          onOpenChange={setShowCheckoutModal}
          presenca={presenca}
          viagensHoje={viagensHoje}
          onConfirm={onCheckout}
          loading={loading}
        />

        <VeiculoFotosModal
          open={showFotosModal}
          onOpenChange={setShowFotosModal}
          veiculo={veiculoExibir}
        />
      </>
    );
  }

  // Estado APÓS check-out
  return (
    <Card className="border-muted bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground capitalize">{hoje}</p>
            <p className="font-semibold">Controle de Presença</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            Expediente encerrado
          </span>
        </div>

        {/* Veículo utilizado */}
        {presenca?.veiculo && (
          <div className="p-3 rounded-lg bg-background/50 border mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Veículo utilizado:</span>
              <code className="font-medium">{presenca.veiculo.placa}</code>
            </div>
            
            {/* Botão Ver Fotos */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => setShowFotosModal(true)}
            >
              <Camera className="h-4 w-4 mr-2" />
              Ver Fotos
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatTime(presenca?.checkin_at ?? null)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground">Saída</p>
            <p className="text-lg font-bold text-destructive">
              {formatTime(presenca?.checkout_at ?? null)}
            </p>
          </div>
        </div>

        {presenca?.observacao_checkout && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Observação do check-out:</p>
            <p className="text-amber-600 dark:text-amber-400">
              {presenca.observacao_checkout}
            </p>
          </div>
        )}

        {!presenca?.observacao_checkout && (
          <p className="text-sm text-center text-muted-foreground py-2">
            Você já finalizou seu expediente de hoje.
          </p>
        )}
      </CardContent>

      <VeiculoFotosModal
        open={showFotosModal}
        onOpenChange={setShowFotosModal}
        veiculo={presenca?.veiculo || null}
      />
    </Card>
  );
}
