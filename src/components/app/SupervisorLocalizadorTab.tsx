import { useState, useMemo } from 'react';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, 
  Car, 
  MapPin, 
  Navigation,
  Home,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditarLocalizacaoModal } from '@/components/motoristas/EditarLocalizacaoModal';

interface SupervisorLocalizadorTabProps {
  eventoId: string;
}

type LocationFilterType = 'em_transito' | 'base' | 'outros' | null;

interface MotoristaCardProps {
  motorista: MotoristaComVeiculo;
  onClick: () => void;
}

function MotoristaCard({ motorista, onClick }: MotoristaCardProps) {
  const isEmTransito = motorista.status === 'em_viagem';
  
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-all active:scale-98"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            isEmTransito ? "bg-blue-500/10" : "bg-primary/10"
          )}>
            {isEmTransito ? (
              <Navigation className="h-5 w-5 text-blue-600" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{motorista.nome}</p>
            {motorista.veiculo && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Car className="h-3 w-3" />
                {motorista.veiculo.nome || motorista.veiculo.placa}
              </p>
            )}
            {/* Show route for drivers in transit */}
            {isEmTransito && motorista.viagem_origem && motorista.viagem_destino && (
              <p className="text-xs text-blue-600 mt-1 truncate">
                {motorista.viagem_origem} → {motorista.viagem_destino}
              </p>
            )}
          </div>
          {!isEmTransito && motorista.ultima_localizacao && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {motorista.ultima_localizacao}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LocationGroupProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  motoristas: MotoristaComVeiculo[];
  onCardClick: (motorista: MotoristaComVeiculo) => void;
  defaultOpen?: boolean;
}

function LocationGroup({ title, icon: Icon, iconColor, motoristas, onCardClick, defaultOpen = true }: LocationGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  if (motoristas.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 group">
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          ({motoristas.length})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pl-6 pb-4">
          {motoristas.map(m => (
            <MotoristaCard
              key={m.id}
              motorista={m}
              onClick={() => onCardClick(m)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SupervisorLocalizadorTab({ eventoId }: SupervisorLocalizadorTabProps) {
  const { motoristas, motoristasPorLocalizacao, localizacoes, loading, refetch } = useLocalizadorMotoristas(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const [editingMotorista, setEditingMotorista] = useState<MotoristaComVeiculo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilterType>(null);

  // Find base point
  const basePonto = pontos.find(p => p.eh_base);
  const baseName = basePonto?.nome || 'Base';

  // Calculate stats
  const activeMotoristas = motoristas.filter(m => m.ativo !== false);
  const emTransito = motoristasPorLocalizacao['em_transito'] || [];
  const naBase = activeMotoristas.filter(m => 
    m.ultima_localizacao === baseName || 
    m.ultima_localizacao === 'Base'
  );
  const semLocal = motoristasPorLocalizacao['sem_local'] || [];
  const outrosLocais = activeMotoristas.filter(m => 
    m.status !== 'em_viagem' &&
    m.ultima_localizacao && 
    m.ultima_localizacao !== baseName && 
    m.ultima_localizacao !== 'Base'
  );

  const stats = {
    emTransito: emTransito.length,
    base: naBase.length,
    outros: outrosLocais.length + semLocal.length,
  };

  // Filter and search
  const filteredMotoristas = useMemo(() => {
    let filtered = activeMotoristas;
    
    // Apply location filter
    if (locationFilter === 'em_transito') {
      filtered = emTransito;
    } else if (locationFilter === 'base') {
      filtered = naBase;
    } else if (locationFilter === 'outros') {
      filtered = [...outrosLocais, ...semLocal];
    }
    
    // Apply text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.nome.toLowerCase().includes(term) ||
        m.telefone?.toLowerCase().includes(term) ||
        m.veiculo?.placa?.toLowerCase().includes(term) ||
        m.ultima_localizacao?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [activeMotoristas, emTransito, naBase, outrosLocais, semLocal, locationFilter, searchTerm]);

  // Group motoristas by location for display
  const groupedMotoristas = useMemo(() => {
    const groups: Record<string, MotoristaComVeiculo[]> = {};
    
    filteredMotoristas.forEach(m => {
      if (m.status === 'em_viagem') {
        if (!groups['Em Trânsito']) groups['Em Trânsito'] = [];
        groups['Em Trânsito'].push(m);
      } else if (m.ultima_localizacao === baseName || m.ultima_localizacao === 'Base') {
        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(m);
      } else if (m.ultima_localizacao) {
        if (!groups[m.ultima_localizacao]) groups[m.ultima_localizacao] = [];
        groups[m.ultima_localizacao].push(m);
      } else {
        if (!groups['Sem Localização']) groups['Sem Localização'] = [];
        groups['Sem Localização'].push(m);
      }
    });
    
    return groups;
  }, [filteredMotoristas, baseName]);

  const toggleFilter = (filter: LocationFilterType) => {
    setLocationFilter(prev => prev === filter ? null : filter);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats filters */}
      <div className="grid grid-cols-3 gap-2">
        <Card 
          className={cn(
            "cursor-pointer transition-all active:scale-95",
            locationFilter === 'em_transito' 
              ? "ring-2 ring-blue-500 border-blue-500" 
              : "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50"
          )}
          onClick={() => toggleFilter('em_transito')}
        >
          <CardContent className="p-3 text-center">
            <Navigation className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-600">{stats.emTransito}</p>
            <p className="text-[10px] text-muted-foreground">Em Trânsito</p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all active:scale-95",
            locationFilter === 'base' 
              ? "ring-2 ring-emerald-500 border-emerald-500" 
              : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
          )}
          onClick={() => toggleFilter('base')}
        >
          <CardContent className="p-3 text-center">
            <Home className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-600">{stats.base}</p>
            <p className="text-[10px] text-muted-foreground">{baseName}</p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all active:scale-95",
            locationFilter === 'outros' 
              ? "ring-2 ring-primary border-primary" 
              : "border-primary/30 bg-primary/5 hover:border-primary/50"
          )}
          onClick={() => toggleFilter('outros')}
        >
          <CardContent className="p-3 text-center">
            <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-primary">{stats.outros}</p>
            <p className="text-[10px] text-muted-foreground">Outros</p>
          </CardContent>
        </Card>
      </div>

      {/* Active filter indicator */}
      {locationFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtro:</span>
          <button 
            onClick={() => setLocationFilter(null)}
            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
          >
            {locationFilter === 'em_transito' && 'Em Trânsito'}
            {locationFilter === 'base' && baseName}
            {locationFilter === 'outros' && 'Outros Locais'}
            <span className="ml-1">×</span>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar motorista..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        {filteredMotoristas.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {locationFilter || searchTerm ? 'Nenhum motorista encontrado' : 'Nenhum motorista ativo'}
            </p>
          </div>
        ) : (
          <>
            {/* Em Trânsito */}
            {groupedMotoristas['Em Trânsito'] && (
              <LocationGroup
                title="Em Trânsito"
                icon={Navigation}
                iconColor="text-blue-600"
                motoristas={groupedMotoristas['Em Trânsito']}
                onCardClick={setEditingMotorista}
              />
            )}

            {/* Base */}
            {groupedMotoristas[baseName] && (
              <LocationGroup
                title={baseName}
                icon={Home}
                iconColor="text-emerald-600"
                motoristas={groupedMotoristas[baseName]}
                onCardClick={setEditingMotorista}
              />
            )}

            {/* Other locations */}
            {Object.entries(groupedMotoristas)
              .filter(([loc]) => loc !== 'Em Trânsito' && loc !== baseName && loc !== 'Sem Localização')
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([location, mots]) => (
                <LocationGroup
                  key={location}
                  title={location}
                  icon={MapPin}
                  iconColor="text-primary"
                  motoristas={mots}
                  onCardClick={setEditingMotorista}
                  defaultOpen={false}
                />
              ))
            }

            {/* Sem Localização */}
            {groupedMotoristas['Sem Localização'] && (
              <LocationGroup
                title="Sem Localização"
                icon={HelpCircle}
                iconColor="text-muted-foreground"
                motoristas={groupedMotoristas['Sem Localização']}
                onCardClick={setEditingMotorista}
                defaultOpen={false}
              />
            )}
          </>
        )}
      </div>

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
            refetch();
          }}
        />
      )}
    </div>
  );
}
