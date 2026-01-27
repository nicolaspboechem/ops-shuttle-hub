import { useState } from 'react';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  User, 
  Car, 
  MapPin, 
  Navigation,
  Home,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditarLocalizacaoModal } from '@/components/motoristas/EditarLocalizacaoModal';

interface SupervisorLocalizadorTabProps {
  eventoId: string;
}

interface ColumnProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  motoristas: MotoristaComVeiculo[];
  onCardClick: (motorista: MotoristaComVeiculo) => void;
}

function LocalizadorColumn({ title, icon: Icon, iconColor, motoristas, onCardClick }: ColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="font-semibold text-sm truncate">{title}</span>
        <Badge variant="secondary" className="ml-auto">
          {motoristas.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[200px]">
        {motoristas.map(m => (
          <Card 
            key={m.id} 
            className="cursor-pointer hover:bg-muted/50 transition-all active:scale-98"
            onClick={() => onCardClick(m)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.nome}</p>
                  {m.veiculo && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {m.veiculo.nome || m.veiculo.placa}
                    </p>
                  )}
                </div>
              </div>
              {/* Show route for drivers in transit */}
              {m.status === 'em_viagem' && m.viagem_origem && m.viagem_destino && (
                <div className="flex items-center gap-1 text-xs bg-blue-500/10 px-2 py-1 rounded mt-2">
                  <Navigation className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-700 truncate">
                    {m.viagem_origem} → {m.viagem_destino}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {motoristas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum motorista
          </div>
        )}
      </div>
    </div>
  );
}

export function SupervisorLocalizadorTab({ eventoId }: SupervisorLocalizadorTabProps) {
  const { motoristas, motoristasPorLocalizacao, localizacoes, loading } = useLocalizadorMotoristas(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const [editingMotorista, setEditingMotorista] = useState<MotoristaComVeiculo | null>(null);

  // Find base point
  const basePonto = pontos.find(p => p.eh_base);
  const baseName = basePonto?.nome || 'Base';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-72 flex-shrink-0 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active motoristas count
  const totalAtivos = motoristas.filter(m => m.ativo !== false).length;
  const emTransito = motoristasPorLocalizacao['em_transito']?.length || 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Total: <strong>{totalAtivos}</strong> motoristas
        </span>
        {emTransito > 0 && (
          <Badge className="bg-blue-600">
            <Navigation className="h-3 w-3 mr-1" />
            {emTransito} em trânsito
          </Badge>
        )}
      </div>

      {/* Horizontal scroll container */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {/* Em Trânsito - always first */}
          <LocalizadorColumn
            title="Em Trânsito"
            icon={Navigation}
            iconColor="text-blue-600"
            motoristas={motoristasPorLocalizacao['em_transito'] || []}
            onCardClick={setEditingMotorista}
          />

          {/* Base */}
          <LocalizadorColumn
            title={baseName}
            icon={Home}
            iconColor="text-emerald-600"
            motoristas={motoristas.filter(m => 
              m.ultima_localizacao === baseName || 
              m.ultima_localizacao === 'Base'
            )}
            onCardClick={setEditingMotorista}
          />

          {/* Other locations */}
          {localizacoes
            .filter(loc => loc !== baseName && loc !== 'Base')
            .map(localizacao => (
              <LocalizadorColumn
                key={localizacao}
                title={localizacao}
                icon={MapPin}
                iconColor="text-primary"
                motoristas={motoristasPorLocalizacao[localizacao] || []}
                onCardClick={setEditingMotorista}
              />
            ))
          }

          {/* Sem localização */}
          {(motoristasPorLocalizacao['sem_local']?.length || 0) > 0 && (
            <LocalizadorColumn
              title="Sem Localização"
              icon={HelpCircle}
              iconColor="text-muted-foreground"
              motoristas={motoristasPorLocalizacao['sem_local'] || []}
              onCardClick={setEditingMotorista}
            />
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Edit Location Modal */}
      {editingMotorista && (
        <EditarLocalizacaoModal
          open={!!editingMotorista}
          onOpenChange={() => setEditingMotorista(null)}
          motorista={editingMotorista}
          pontosEmbarque={pontos}
          localizacaoAtual={editingMotorista.ultima_localizacao || null}
          onSave={async (motoristaId: string, novaLocalizacao: string) => {
            const { error } = await supabase
              .from('motoristas')
              .update({ 
                ultima_localizacao: novaLocalizacao,
                ultima_localizacao_at: new Date().toISOString()
              })
              .eq('id', motoristaId);
            
            if (error) throw error;
          }}
        />
      )}
    </div>
  );
}
