import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Viagem } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServerTime } from '@/hooks/useServerTime';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MapPin, ArrowRight, Users, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PontoEmbarque {
  id: string;
  nome: string;
  endereco: string | null;
}

interface RetornoViagemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viagemOriginal: Viagem;
  onSuccess: () => void;
}

export function RetornoViagemForm({ 
  open, 
  onOpenChange, 
  viagemOriginal, 
  onSuccess 
}: RetornoViagemFormProps) {
  const { eventoId } = useParams();
  const { userId, userName } = useCurrentUser();
  const { getAgoraSync } = useServerTime();
  
  const [pontos, setPontos] = useState<PontoEmbarque[]>([]);
  const [loading, setLoading] = useState(false);
  const [pontoDestino, setPontoDestino] = useState<string>('');
  const [qtdPax, setQtdPax] = useState<string>('');

  // Origem é o ponto_desembarque da viagem anterior (onde o veículo está agora)
  const origem = viagemOriginal.ponto_desembarque || viagemOriginal.ponto_embarque || 'Local atual';
  
  // Sugestão: voltar para o ponto de embarque original
  const pontoSugestao = viagemOriginal.ponto_embarque;

  useEffect(() => {
    if (open && eventoId) {
      fetchPontos();
      // Pré-selecionar o ponto de origem como sugestão
      if (pontoSugestao) {
        setPontoDestino(pontoSugestao);
      }
    }
  }, [open, eventoId, pontoSugestao]);

  const fetchPontos = async () => {
    if (!eventoId) return;
    
    const { data, error } = await supabase
      .from('pontos_embarque')
      .select('id, nome, endereco')
      .eq('evento_id', eventoId)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar pontos:', error);
      return;
    }

    setPontos(data || []);
  };

  const handleSubmit = async () => {
    if (!userId || !eventoId) {
      toast.error('Erro de autenticação');
      return;
    }

    if (!pontoDestino) {
      toast.error('Selecione um ponto de destino');
      return;
    }

    if (!qtdPax || parseInt(qtdPax) < 0) {
      toast.error('Informe a quantidade de passageiros');
      return;
    }

    setLoading(true);

    try {
      const serverNow = getAgoraSync();
      const horaPickup = serverNow.toTimeString().slice(0, 8);

      // Resolver IDs normalizados
      const pontoDestinoData = pontos.find(p => p.nome === pontoDestino);
      // Para origem, usar ponto_desembarque_id da viagem original se disponível
      const pontoOrigemId = viagemOriginal.ponto_desembarque_id || viagemOriginal.ponto_embarque_id;

      const novaViagem = {
        evento_id: eventoId,
        // Campos FK normalizados
        motorista_id: viagemOriginal.motorista_id,
        veiculo_id: viagemOriginal.veiculo_id,
        ponto_embarque_id: pontoOrigemId || null,
        ponto_desembarque_id: pontoDestinoData?.id || null,
        // Campos de texto (compatibilidade)
        motorista: viagemOriginal.motorista,
        placa: viagemOriginal.placa,
        tipo_veiculo: viagemOriginal.tipo_veiculo,
        tipo_operacao: viagemOriginal.tipo_operacao,
        coordenador: viagemOriginal.coordenador,
        ponto_embarque: origem, // Onde está agora
        ponto_desembarque: pontoDestino, // Para onde vai
        qtd_pax: parseInt(qtdPax),
        status: 'em_andamento',
        h_pickup: horaPickup,
        h_inicio_real: serverNow.toISOString(),
        iniciado_por: userId,
        criado_por: userId,
        atualizado_por: userId,
        observacao: `Retorno - Rota continuação`,
        viagem_pai_id: viagemOriginal.id // Vincula à viagem anterior para rastreamento
      };

      const { error } = await supabase
        .from('viagens')
        .insert([novaViagem]);

      if (error) {
        console.error('Erro ao criar viagem de retorno:', error);
        toast.error('Erro ao criar viagem de retorno');
        return;
      }

      // Registrar log
      await supabase.from('viagem_logs').insert([{
        viagem_id: viagemOriginal.id,
        user_id: userId,
        acao: 'retorno',
        detalhes: {
          tipo: 'nova_viagem_retorno',
          destino: pontoDestino,
          qtd_pax: parseInt(qtdPax),
          nome_usuario: userName
        }
      }]);

      toast.success('Viagem de retorno iniciada!');
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setPontoDestino('');
      setQtdPax('');
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Iniciar Retorno
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Origem (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Origem (local atual)</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="font-medium">{origem}</span>
            </div>
          </div>

          {/* Destino (select) */}
          <div className="space-y-2">
            <Label>Destino</Label>
            <Select value={pontoDestino} onValueChange={setPontoDestino}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent>
                {pontos.map(ponto => (
                  <SelectItem 
                    key={ponto.id} 
                    value={ponto.nome}
                    className={cn(
                      ponto.nome === pontoSugestao && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{ponto.nome}</span>
                      {ponto.nome === pontoSugestao && (
                        <Sparkles className="h-3 w-3 text-primary ml-1" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {pontoSugestao && pontoDestino !== pontoSugestao && (
              <button
                type="button"
                onClick={() => setPontoDestino(pontoSugestao)}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Sugestão: Retornar para {pontoSugestao}
              </button>
            )}
          </div>

          {/* Quantidade de PAX */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quantidade de Passageiros
            </Label>
            <Input
              type="number"
              value={qtdPax}
              onChange={e => setQtdPax(e.target.value)}
              placeholder="0"
              min="0"
              className="h-12 text-lg"
            />
          </div>

          {/* Info do veículo/motorista */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{viagemOriginal.motorista}</span>
            </div>
            <div className="text-muted-foreground">
              {viagemOriginal.placa} • {viagemOriginal.tipo_veiculo}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !pontoDestino || !qtdPax}
              className="flex-1 h-12"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Iniciar Rota
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
