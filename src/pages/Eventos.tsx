import { RefreshCw, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventoCard } from '@/components/eventos/EventoCard';
import { useEventos } from '@/hooks/useEventos';
import { MainLayout } from '@/components/layout/MainLayout';

export default function Eventos() {
  const { eventos, loading, lastUpdate, refetch } = useEventos();

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
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
              {eventos.length} evento{eventos.length !== 1 ? 's' : ''} disponíve{eventos.length !== 1 ? 'is' : 'l'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {eventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground max-w-md">
              Os eventos serão criados automaticamente quando você sincronizar uma planilha.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map((evento) => (
              <EventoCard key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
