import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, Car, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Veiculo {
  id: string;
  placa: string;
  modelo: string | null;
  tipo_veiculo: string;
  km_inicial: number | null;
  km_inicial_data: string | null;
  km_final: number | null;
  km_final_data: string | null;
}

interface VeiculoKmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onUpdated?: () => void;
}

export function VeiculoKmModal({ open, onOpenChange, eventoId, onUpdated }: VeiculoKmModalProps) {
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  const [kmType, setKmType] = useState<'inicial' | 'final'>('inicial');
  const [kmValue, setKmValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingVeiculos, setLoadingVeiculos] = useState(true);

  const selectedVeiculo = veiculos.find(v => v.id === selectedVeiculoId);

  useEffect(() => {
    if (open && eventoId) {
      fetchVeiculos();
    }
  }, [open, eventoId]);

  useEffect(() => {
    // Pre-fill km value when vehicle or type changes
    if (selectedVeiculo) {
      if (kmType === 'inicial' && selectedVeiculo.km_inicial) {
        setKmValue(selectedVeiculo.km_inicial.toString());
      } else if (kmType === 'final' && selectedVeiculo.km_final) {
        setKmValue(selectedVeiculo.km_final.toString());
      } else {
        setKmValue('');
      }
    }
  }, [selectedVeiculoId, kmType, selectedVeiculo]);

  const fetchVeiculos = async () => {
    setLoadingVeiculos(true);
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, modelo, tipo_veiculo, km_inicial, km_inicial_data, km_final, km_final_data')
        .eq('evento_id', eventoId)
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;
      setVeiculos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoadingVeiculos(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVeiculoId || !kmValue || !user) return;

    const kmNum = parseInt(kmValue);
    if (isNaN(kmNum) || kmNum < 0) {
      toast.error('Valor de KM inválido');
      return;
    }

    // Validate km_final > km_inicial
    if (kmType === 'final' && selectedVeiculo?.km_inicial && kmNum < selectedVeiculo.km_inicial) {
      toast.error('KM final deve ser maior que KM inicial');
      return;
    }

    setLoading(true);
    try {
      const updateData = kmType === 'inicial' 
        ? { 
            km_inicial: kmNum, 
            km_inicial_data: new Date().toISOString(),
            km_inicial_registrado_por: user.id 
          }
        : { 
            km_final: kmNum, 
            km_final_data: new Date().toISOString(),
            km_final_registrado_por: user.id 
          };

      const { error } = await supabase
        .from('veiculos')
        .update(updateData)
        .eq('id', selectedVeiculoId);

      if (error) throw error;

      toast.success(`KM ${kmType} registrado com sucesso!`);
      onOpenChange(false);
      onUpdated?.();
      
      // Reset form
      setSelectedVeiculoId('');
      setKmValue('');
    } catch (error: any) {
      toast.error(`Erro ao registrar KM: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Registrar Quilometragem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de veículo */}
          <div className="space-y-2">
            <Label>Veículo</Label>
            {loadingVeiculos ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : veiculos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum veículo cadastrado neste evento
              </p>
            ) : (
              <Select value={selectedVeiculoId} onValueChange={setSelectedVeiculoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span className="font-medium">{v.placa}</span>
                        {v.modelo && <span className="text-muted-foreground">- {v.modelo}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Info do veículo selecionado */}
          {selectedVeiculo && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">KM Inicial:</span>
                <span className="font-medium">
                  {selectedVeiculo.km_inicial 
                    ? `${selectedVeiculo.km_inicial.toLocaleString()} km`
                    : 'Não registrado'}
                </span>
              </div>
              {selectedVeiculo.km_inicial_data && (
                <p className="text-xs text-muted-foreground text-right">
                  {formatDate(selectedVeiculo.km_inicial_data)}
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">KM Final:</span>
                <span className="font-medium">
                  {selectedVeiculo.km_final 
                    ? `${selectedVeiculo.km_final.toLocaleString()} km`
                    : 'Não registrado'}
                </span>
              </div>
              {selectedVeiculo.km_final_data && (
                <p className="text-xs text-muted-foreground text-right">
                  {formatDate(selectedVeiculo.km_final_data)}
                </p>
              )}
              {selectedVeiculo.km_inicial && selectedVeiculo.km_final && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Total percorrido:</span>
                  <span className="font-bold text-primary">
                    {(selectedVeiculo.km_final - selectedVeiculo.km_inicial).toLocaleString()} km
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tipo de KM */}
          <div className="space-y-2">
            <Label>Tipo de Registro</Label>
            <Select value={kmType} onValueChange={(v) => setKmType(v as 'inicial' | 'final')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inicial">KM Inicial (início do evento)</SelectItem>
                <SelectItem value="final">KM Final (fim do evento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor do KM */}
          <div className="space-y-2">
            <Label>Quilometragem</Label>
            <Input
              type="number"
              placeholder="Ex: 45230"
              value={kmValue}
              onChange={(e) => setKmValue(e.target.value)}
              min={0}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!selectedVeiculoId || !kmValue || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
