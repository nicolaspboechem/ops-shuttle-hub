import { useMemo, useState } from 'react';
import { RefreshCw, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventoGroupCard } from '@/components/eventos/EventoGroupCard';
import { CreateEventoWizard } from '@/components/eventos/CreateEventoWizard';
import { useEventos } from '@/hooks/useEventos';
import { MainLayout } from '@/components/layout/MainLayout';
import { Evento } from '@/lib/types/viagem';

// Extract base name from event name (remove dates and specific identifiers)
function getEventBaseName(nome: string): string {
  // Remove date patterns like "2025-12-05", "05 de Dezembro", "04/12", etc.
  let baseName = nome
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/\d{2}\s+de\s+\w+/gi, '')
    .replace(/\d{2}\/\d{2}/g, '')
    .replace(/-\s*Desconhecido/gi, '')
    .replace(/Shuttle\s*/gi, 'CCXP ')
    .replace(/\s+-\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If the name starts with "CCXP", group all CCXP events together
  if (baseName.toLowerCase().includes('ccxp')) {
    return 'CCXP 2024';
  }
  
  return baseName || nome;
}

// Group events by base name
function groupEventos(eventos: Evento[]): Record<string, Evento[]> {
  const groups: Record<string, Evento[]> = {};
  
  for (const evento of eventos) {
    const baseName = getEventBaseName(evento.nome_planilha);
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(evento);
  }
  
  // Sort events within each group by date
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => 
      new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime()
    );
  }
  
  return groups;
}

export default function Eventos() {
  const { eventos, loading, lastUpdate, refetch } = useEventos();
  const [activeTab, setActiveTab] = useState<'ativos' | 'inativos'>('ativos');

  // Filter events by status
  const eventosAtivos = useMemo(() => 
    eventos.filter(e => e.status === 'ativo'), 
    [eventos]
  );
  
  const eventosInativos = useMemo(() => 
    eventos.filter(e => e.status !== 'ativo'), 
    [eventos]
  );

  const currentEventos = activeTab === 'ativos' ? eventosAtivos : eventosInativos;
  const groupedEventos = useMemo(() => groupEventos(currentEventos), [currentEventos]);
  const groupNames = Object.keys(groupedEventos);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Eventos</h2>
            <p className="text-muted-foreground">
              {eventosAtivos.length} ativo{eventosAtivos.length !== 1 ? 's' : ''} • {eventosInativos.length} inativo{eventosInativos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <CreateEventoWizard
              onSuccess={refetch}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Evento
                </Button>
              }
            />
          </div>
        </div>

        {/* Tabs Ativos/Inativos */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="ativos" className="flex-1">
              Eventos Ativos ({eventosAtivos.length})
            </TabsTrigger>
            <TabsTrigger value="inativos" className="flex-1">
              Eventos Inativos ({eventosInativos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="mt-6">
            {groupNames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum evento ativo</h3>
                <p className="text-muted-foreground max-w-md">
                  Crie um novo evento ou ative um evento existente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupNames.map((groupName) => (
                  <EventoGroupCard 
                    key={groupName} 
                    groupName={groupName} 
                    eventos={groupedEventos[groupName]}
                    onUpdate={refetch}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inativos" className="mt-6">
            {groupNames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum evento inativo</h3>
                <p className="text-muted-foreground max-w-md">
                  Eventos finalizados, ocultos ou arquivados aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupNames.map((groupName) => (
                  <EventoGroupCard 
                    key={groupName} 
                    groupName={groupName} 
                    eventos={groupedEventos[groupName]}
                    onUpdate={refetch}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
