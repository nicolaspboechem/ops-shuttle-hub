import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Car, Fuel, Gauge, AlertTriangle, Camera, Calendar, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Veiculo } from '@/hooks/useCadastros';

interface VeiculoFoto {
  id: string;
  url: string;
  area_veiculo: string | null;
  descricao: string | null;
  tipo: string | null;
  ordem: number | null;
}

interface VeiculoFotosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  showConfirmation?: boolean;
  onConfirm?: () => void;
}

export function VeiculoFotosModal({ 
  open, 
  onOpenChange, 
  veiculo,
  showConfirmation = false,
  onConfirm
}: VeiculoFotosModalProps) {
  const [fotos, setFotos] = useState<VeiculoFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Buscar fotos quando o modal abrir
  useEffect(() => {
    if (open && veiculo?.id) {
      fetchFotos();
    }
  }, [open, veiculo?.id]);

  const fetchFotos = async () => {
    if (!veiculo?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('veiculo_fotos')
        .select('*')
        .eq('veiculo_id', veiculo.id)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNivelCombustivelLabel = (nivel: string | null | undefined) => {
    const niveis: Record<string, { label: string; color: string }> = {
      'vazio': { label: 'Vazio', color: 'bg-red-500' },
      '1/4': { label: '1/4', color: 'bg-orange-500' },
      '1/2': { label: '1/2', color: 'bg-yellow-500' },
      '3/4': { label: '3/4', color: 'bg-green-500' },
      'cheio': { label: 'Cheio', color: 'bg-green-600' }
    };
    return niveis[nivel || ''] || { label: nivel || '-', color: 'bg-muted' };
  };

  const getAreaLabel = (area: string | null) => {
    const areas: Record<string, string> = {
      'frente': 'Frente',
      'traseira': 'Traseira',
      'lateral_esquerda': 'Lateral Esq.',
      'lateral_direita': 'Lateral Dir.',
      'interior': 'Interior',
      'painel': 'Painel',
      'pneus': 'Pneus',
      'geral': 'Geral'
    };
    return areas[area || ''] || area || 'Foto';
  };

  // Extrair avarias do inspecao_dados
  const getAvarias = () => {
    if (!veiculo?.inspecao_dados) return [];
    
    const dados = veiculo.inspecao_dados as Record<string, unknown>;
    const avarias: { area: string; descricao: string }[] = [];
    
    // Percorrer áreas da inspeção
    Object.entries(dados).forEach(([area, areaData]) => {
      if (typeof areaData === 'object' && areaData !== null) {
        const data = areaData as Record<string, unknown>;
        if (data.avaria && data.descricao_avaria) {
          avarias.push({
            area: getAreaLabel(area),
            descricao: String(data.descricao_avaria)
          });
        }
      }
    });
    
    return avarias;
  };

  const avarias = getAvarias();
  const combustivel = getNivelCombustivelLabel(veiculo?.nivel_combustivel);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onOpenChange(false);
  };

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Fotos do Veículo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-4 pt-0 space-y-4">
            {/* Info do Veículo */}
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="text-lg font-bold">{veiculo.placa}</code>
                  {veiculo.nome && (
                    <span className="text-sm text-muted-foreground">
                      ({veiculo.nome})
                    </span>
                  )}
                </div>
                <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Combustível:</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs text-white ${combustivel.color}`}>
                    {combustivel.label}
                  </span>
                </div>
                {veiculo.km_inicial && (
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">KM:</span>
                    <span>{veiculo.km_inicial.toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
              
              {veiculo.inspecao_data && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
                  <Calendar className="h-3 w-3" />
                  <span>Última vistoria:</span>
                  <span>{format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Alerta de Avarias */}
            {veiculo.possui_avarias && avarias.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Avarias Registradas</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {avarias.map((avaria, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-muted-foreground">{avaria.area}:</span>
                      <span>{avaria.descricao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grid de Fotos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4" />
                <span>Fotos ({fotos.length})</span>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : fotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((foto) => (
                    <a
                      key={foto.id}
                      href={foto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img
                        src={foto.url}
                        alt={foto.descricao || getAreaLabel(foto.area_veiculo)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <span className="text-xs text-white font-medium">
                          {getAreaLabel(foto.area_veiculo)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-lg bg-muted/30 border border-dashed">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma foto disponível
                  </p>
                </div>
              )}
            </div>

            {/* Confirmação opcional */}
            {showConfirmation && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Checkbox
                  id="confirm-photos"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <label
                  htmlFor="confirm-photos"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirmo que visualizei as fotos e condições do veículo
                </label>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 pt-2 border-t">
          {showConfirmation ? (
            <Button 
              className="w-full" 
              onClick={handleConfirm}
              disabled={!confirmed}
            >
              Confirmar Visualização
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
