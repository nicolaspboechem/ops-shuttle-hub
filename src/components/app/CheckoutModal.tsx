import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LogOut, Clock, Car, Route, Loader2 } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MotoristaPresencaComVeiculo } from '@/hooks/useMotoristaPresenca';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presenca: MotoristaPresencaComVeiculo | null;
  viagensHoje?: number;
  onConfirm: (observacao?: string) => Promise<boolean>;
  loading?: boolean;
  eventoId?: string;
  motoristaNome?: string;
}

export function CheckoutModal({
  open,
  onOpenChange,
  presenca,
  viagensHoje = 0,
  onConfirm,
  loading,
  eventoId,
  motoristaNome
}: CheckoutModalProps) {
  const { user, profile } = useAuth();
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    
    // Se tem observação e veículo, registrar no histórico de vistorias
    if (observacao.trim() && presenca?.veiculo_id && eventoId) {
      try {
        await supabase.from('veiculo_vistoria_historico').insert({
          veiculo_id: presenca.veiculo_id,
          evento_id: eventoId,
          tipo_vistoria: 'checkout',
          status_anterior: 'liberado',
          status_novo: 'liberado', // Mantém liberado, mas registra a observação
          possui_avarias: true, // Assume que observação indica problema
          inspecao_dados: null,
          fotos_urls: null,
          nivel_combustivel: null,
          km_registrado: null,
          observacoes: observacao.trim(),
          realizado_por: user?.id || null,
          realizado_por_nome: profile?.full_name || null,
          motorista_id: presenca.motorista_id,
          motorista_nome: motoristaNome || null
        });
      } catch (err) {
        console.error('Erro ao registrar histórico de checkout:', err);
      }
    }
    
    const success = await onConfirm(observacao.trim() || undefined);
    setSubmitting(false);
    
    if (success) {
      setObservacao('');
      onOpenChange(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  const calcularTempoTrabalhado = () => {
    if (!presenca?.checkin_at) return null;
    const checkinTime = parseISO(presenca.checkin_at);
    const now = new Date();
    const minutos = differenceInMinutes(now, checkinTime);
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              Encerrar Expediente
            </DrawerTitle>
            <DrawerDescription>
              Revise o resumo do dia e adicione observações se necessário
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {/* Resumo do dia */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm">Resumo do Expediente</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Entrada</p>
                    <p className="font-medium">{formatTime(presenca?.checkin_at ?? null)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo Trabalhado</p>
                    <p className="font-medium">{calcularTempoTrabalhado() || '--'}</p>
                  </div>
                </div>
              </div>

              {presenca?.veiculo && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Veículo Utilizado</p>
                    <p className="font-medium">
                      {presenca.veiculo.placa}
                      {presenca.veiculo.nome && ` (${presenca.veiculo.nome})`}
                    </p>
                  </div>
                </div>
              )}

              {viagensHoje > 0 && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Viagens Realizadas</p>
                    <p className="font-medium">{viagensHoje} viagens</p>
                  </div>
                </div>
              )}
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao">
                Observações (opcional)
              </Label>
              <Textarea
                id="observacao"
                placeholder="Danos no veículo, problemas durante o expediente, etc..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Informe qualquer ocorrência relevante para a equipe
              </p>
            </div>

            {presenca?.veiculo && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <strong>Atenção:</strong> Ao confirmar, o veículo{' '}
                  <span className="font-mono">{presenca.veiculo.placa}</span> será 
                  desvinculado do seu cadastro.
                </p>
              </div>
            )}
          </div>

          <DrawerFooter className="pt-4">
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={submitting || loading}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Confirmar Check-out
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
