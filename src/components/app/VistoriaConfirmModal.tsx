import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Car, 
  AlertTriangle, 
  Fuel, 
  Eye, 
  Gauge, 
  CheckCircle2,
  Image as ImageIcon,
  Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Veiculo } from '@/hooks/useCadastros';
import { supabase } from '@/integrations/supabase/client';

interface VeiculoFoto {
  id: string;
  url: string;
  area_veiculo: string | null;
  descricao: string | null;
}

interface AreaInspecao {
  id: string;
  nome: string;
  possuiAvaria: boolean;
  descricao: string;
}

interface VistoriaConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  onConfirm: () => Promise<boolean>;
  loading?: boolean;
}

export function VistoriaConfirmModal({
  open,
  onOpenChange,
  veiculo,
  onConfirm,
  loading
}: VistoriaConfirmModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [fotos, setFotos] = useState<VeiculoFoto[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset confirmation when modal opens
  useEffect(() => {
    if (open) {
      setConfirmed(false);
    }
  }, [open]);

  // Fetch vehicle photos when modal opens
  useEffect(() => {
    if (open && veiculo?.id) {
      fetchFotos();
    }
  }, [open, veiculo?.id]);

  const fetchFotos = async () => {
    if (!veiculo?.id) return;
    
    setLoadingFotos(true);
    try {
      const { data } = await supabase
        .from('veiculo_fotos')
        .select('id, url, area_veiculo, descricao')
        .eq('veiculo_id', veiculo.id)
        .order('ordem', { ascending: true });
      
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
    } finally {
      setLoadingFotos(false);
    }
  };

  // Parse inspection data from JSON
  const getAvarias = (): AreaInspecao[] => {
    if (!veiculo?.inspecao_dados) return [];
    
    try {
      const dados = veiculo.inspecao_dados as AreaInspecao[];
      if (Array.isArray(dados)) {
        return dados.filter(area => area.possuiAvaria);
      }
    } catch {
      // Invalid JSON
    }
    return [];
  };

  const avarias = getAvarias();

  const getNivelCombustivelLabel = (nivel: string | null | undefined) => {
    const niveis: Record<string, { label: string; color: string }> = {
      'vazio': { label: 'Vazio', color: 'text-red-500' },
      '1/4': { label: '1/4', color: 'text-orange-500' },
      '1/2': { label: '1/2', color: 'text-yellow-500' },
      '3/4': { label: '3/4', color: 'text-green-500' },
      'cheio': { label: 'Cheio', color: 'text-green-600' }
    };
    return niveis[nivel || ''] || { label: nivel || '-', color: 'text-muted-foreground' };
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const success = await onConfirm();
    setSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  if (!veiculo) return null;

  const combustivel = getNivelCombustivelLabel(veiculo.nivel_combustivel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Confirmação de Vistoria
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Vehicle Info */}
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">{veiculo.placa}</span>
                </div>
                <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
              </div>
              
              {veiculo.nome && (
                <p className="text-sm text-muted-foreground">{veiculo.nome}</p>
              )}

              <div className="flex flex-wrap gap-3 pt-2 border-t text-sm">
                {veiculo.capacidade && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{veiculo.capacidade} lugares</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  <span className={combustivel.color}>{combustivel.label}</span>
                </div>
                {veiculo.km_inicial && (
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span>{veiculo.km_inicial.toLocaleString()} km</span>
                  </div>
                )}
              </div>

              {veiculo.inspecao_data && (
                <p className="text-xs text-muted-foreground pt-1">
                  Última vistoria: {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </div>

            {/* Photos */}
            {fotos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Fotos do Veículo ({fotos.length})
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {fotos.slice(0, 6).map((foto) => (
                    <a 
                      key={foto.id} 
                      href={foto.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="aspect-square rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img 
                        src={foto.url} 
                        alt={foto.area_veiculo || 'Foto do veículo'} 
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
                {fotos.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{fotos.length - 6} foto(s) adicionais
                  </p>
                )}
              </div>
            )}

            {/* Damages */}
            {avarias.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Avarias Registradas ({avarias.length})
                </div>
                <div className="space-y-2">
                  {avarias.map((area) => (
                    <div 
                      key={area.id} 
                      className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm"
                    >
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {area.nome}
                      </p>
                      {area.descricao && (
                        <p className="text-amber-600 dark:text-amber-300 mt-0.5">
                          {area.descricao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Nenhuma avaria registrada
                </span>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox 
                  checked={confirmed} 
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-relaxed">
                  Li e confirmo que <strong>verifiquei o estado atual do veículo</strong> e estou ciente das avarias registradas. Ao confirmar, assumo a responsabilidade pelo veículo durante meu expediente.
                </span>
              </label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!confirmed || submitting || loading}
            className="flex-1 gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmar Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
