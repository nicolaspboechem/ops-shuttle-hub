import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, Bus, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Evento } from '@/lib/types/viagem';

interface EventoCardProps {
  evento: Evento;
}

export function EventoCard({ evento }: EventoCardProps) {
  const navigate = useNavigate();

  const statusConfig = {
    ativo: { label: 'Ativo', className: 'bg-status-ok text-status-ok-foreground' },
    finalizado: { label: 'Finalizado', className: 'bg-muted text-muted-foreground' },
    processando: { label: 'Processando', className: 'bg-status-alert text-status-alert-foreground' }
  };

  const status = statusConfig[evento.status];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
      onClick={() => navigate(`/evento/${evento.id}`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground truncate">
              {evento.nome_planilha}
            </h3>
            <Badge className={status.className + ' mt-2'}>
              {status.label}
            </Badge>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Criado: {formatDate(evento.data_criacao)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 flex-shrink-0" />
            <span>Última sync: {formatDate(evento.data_ultima_sync)}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Bus className="w-4 h-4 flex-shrink-0" />
            <span>{evento.total_viagens} viagens</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
