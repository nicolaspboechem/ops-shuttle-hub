import { useState, useMemo } from 'react';
import { useRotasPublicas } from '@/hooks/useRotasPublicas';
import { RotaCard } from '@/components/public/RotaCard';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { rotaEstaAtiva } from '@/lib/utils/calcularProximasSaidas';

interface ClientePainelTabProps {
  eventoId: string;
}

export function ClientePainelTab({ eventoId }: ClientePainelTabProps) {
  const { rotas, loading, refetch } = useRotasPublicas(eventoId);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Filtra apenas rotas que ainda estão no horário de operação
  const rotasAtivas = useMemo(() => {
    return rotas.filter(rota => rotaEstaAtiva(rota.horario_fim));
  }, [rotas]);

  const handleRefresh = () => {
    refetch();
    setLastUpdate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Painel de Horários</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {format(lastUpdate, 'HH:mm:ss')}
          </Badge>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid de rotas */}
      {rotasAtivas.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rotasAtivas.map(rota => (
            <RotaCard 
              key={rota.id} 
              nome={rota.nome}
              origem={rota.origem}
              destino={rota.destino}
              frequenciaMinutos={rota.frequencia_minutos}
              horarioInicio={rota.horario_inicio}
              horarioFim={rota.horario_fim}
              observacoes={rota.observacoes}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma rota shuttle em operação no momento</p>
          <p className="text-sm mt-1">Rotas aparecerão aqui durante seus horários de funcionamento</p>
        </div>
      )}
    </div>
  );
}
