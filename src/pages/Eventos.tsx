import { useState, useMemo } from 'react';
import { RefreshCw, FolderOpen, Bus, Car, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventoCard } from '@/components/eventos/EventoCard';
import { useEventos } from '@/hooks/useEventos';
import { useAuth } from '@/lib/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

type FiltroTipo = 'todos' | 'transfer' | 'shuttle';

export default function Eventos() {
  const { eventos, loading, lastUpdate, refetch } = useEventos();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');

  const eventosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return eventos;
    return eventos.filter(e => e.tipo_operacao === filtroTipo);
  }, [eventos, filtroTipo]);

  const contadores = useMemo(() => ({
    todos: eventos.length,
    transfer: eventos.filter(e => e.tipo_operacao === 'transfer').length,
    shuttle: eventos.filter(e => e.tipo_operacao === 'shuttle').length,
  }), [eventos]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between px-8 py-4 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Bus className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Shuttle Control</h1>
              <p className="text-sm text-muted-foreground">Selecione um evento</p>
            </div>
          </div>
        </header>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-8 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Bus className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Shuttle Control</h1>
            <p className="text-sm text-muted-foreground">Selecione um evento</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Eventos</h2>
            <p className="text-muted-foreground">
              {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''} disponíve{eventosFiltrados.length !== 1 ? 'is' : 'l'}
            </p>
          </div>

          <Tabs value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="todos" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Todos ({contadores.todos})
              </TabsTrigger>
              <TabsTrigger value="transfer" className="gap-2">
                <Car className="w-4 h-4" />
                Transfer ({contadores.transfer})
              </TabsTrigger>
              <TabsTrigger value="shuttle" className="gap-2">
                <Bus className="w-4 h-4" />
                Shuttle ({contadores.shuttle})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum evento encontrado
            </h3>
            <p className="text-muted-foreground max-w-md">
              {filtroTipo === 'todos' 
                ? 'Os eventos serão criados automaticamente quando você sincronizar uma planilha do Google Sheets.'
                : `Nenhum evento do tipo ${filtroTipo} encontrado.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventosFiltrados.map((evento) => (
              <EventoCard key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
