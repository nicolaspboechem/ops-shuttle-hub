import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Car, 
  MapPin, 
  Navigation,
  Clock,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OperadorMotoristasTabProps {
  eventoId: string;
}

const statusConfig = {
  disponivel: { label: 'Disponível', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  em_viagem: { label: 'Em Viagem', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  em_pausa: { label: 'Em Pausa', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  indisponivel: { label: 'Indisponível', className: 'bg-muted text-muted-foreground' },
};

function MotoristaCard({ motorista }: { motorista: MotoristaComVeiculo }) {
  const status = (motorista.status || 'disponivel') as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.disponivel;
  
  const ultimaAtualizacao = motorista.ultima_localizacao_at 
    ? formatDistanceToNow(new Date(motorista.ultima_localizacao_at), { 
        addSuffix: true, 
        locale: ptBR 
      })
    : null;

  return (
    <Card className={cn(
      "transition-all",
      status === 'em_viagem' && "border-blue-500/50 bg-blue-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{motorista.nome}</p>
              {motorista.telefone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {motorista.telefone}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        </div>

        {/* Veículo */}
        {motorista.veiculo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Car className="h-4 w-4" />
            <span>{motorista.veiculo.nome || motorista.veiculo.placa}</span>
            <span className="text-xs">({motorista.veiculo.tipo_veiculo})</span>
          </div>
        )}

        {/* Localização ou Rota */}
        {status === 'em_viagem' && motorista.viagem_origem && motorista.viagem_destino ? (
          <div className="flex items-center gap-2 text-sm bg-blue-500/10 p-2 rounded-lg">
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">
              {motorista.viagem_origem} → {motorista.viagem_destino}
            </span>
          </div>
        ) : motorista.ultima_localizacao ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <span>{motorista.ultima_localizacao}</span>
            {ultimaAtualizacao && (
              <span className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {ultimaAtualizacao}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Localização desconhecida</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OperadorMotoristasTab({ eventoId }: OperadorMotoristasTabProps) {
  const { motoristas, loading } = useLocalizadorMotoristas(eventoId);

  const activeMotoristas = motoristas.filter(m => m.ativo !== false);
  
  const counts = {
    disponivel: activeMotoristas.filter(m => m.status === 'disponivel').length,
    em_viagem: activeMotoristas.filter(m => m.status === 'em_viagem').length,
    outros: activeMotoristas.filter(m => !['disponivel', 'em_viagem'].includes(m.status || '')).length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-lg bg-emerald-500/10">
          <p className="text-xl font-bold text-emerald-600">{counts.disponivel}</p>
          <p className="text-[10px] text-muted-foreground">Disponíveis</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-blue-500/10">
          <p className="text-xl font-bold text-blue-600">{counts.em_viagem}</p>
          <p className="text-[10px] text-muted-foreground">Em Viagem</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xl font-bold">{counts.outros}</p>
          <p className="text-[10px] text-muted-foreground">Outros</p>
        </div>
      </div>

      {/* Lista de motoristas */}
      {activeMotoristas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum motorista</p>
          <p className="text-sm">Cadastre motoristas na aba "Mais"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeMotoristas
            .sort((a, b) => {
              // Em viagem primeiro, depois disponíveis, depois outros
              const order = { em_viagem: 0, disponivel: 1 };
              const orderA = order[a.status as keyof typeof order] ?? 2;
              const orderB = order[b.status as keyof typeof order] ?? 2;
              if (orderA !== orderB) return orderA - orderB;
              return a.nome.localeCompare(b.nome);
            })
            .map(motorista => (
              <MotoristaCard key={motorista.id} motorista={motorista} />
            ))
          }
        </div>
      )}
    </div>
  );
}
