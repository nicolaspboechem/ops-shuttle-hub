import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CombustivelGauge } from '@/components/veiculos/CombustivelGauge';
import { Fuel, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAlertasFrota } from '@/hooks/useAlertasFrota';

interface ReportarCombustivelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  veiculoId: string;
  motoristaId: string;
  nivelAtual?: string | null;
}

export function ReportarCombustivelModal({
  open,
  onOpenChange,
  eventoId,
  veiculoId,
  motoristaId,
  nivelAtual,
}: ReportarCombustivelModalProps) {
  const [nivel, setNivel] = useState(nivelAtual || 'vazio');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { criarAlerta } = useAlertasFrota(eventoId);

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      await criarAlerta({
        evento_id: eventoId,
        veiculo_id: veiculoId,
        motorista_id: motoristaId,
        nivel_combustivel: nivel,
        observacao: observacao.trim() || undefined,
      });
      toast.success('Alerta de combustível enviado!');
      setObservacao('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao enviar alerta');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-destructive" />
            Reportar Combustível
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o nível atual de combustível do veículo
          </p>
          <CombustivelGauge value={nivel} onChange={setNivel} />

          <div>
            <label className="text-sm font-medium">Observação (opcional)</label>
            <Textarea
              placeholder="Ex: Preciso abastecer urgente..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleEnviar} disabled={enviando} className="w-full">
            {enviando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar Alerta
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
