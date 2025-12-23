import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEventosPublicos } from '@/hooks/useEventosPublicos';
import { ProximasViagens } from '@/components/public/ProximasViagens';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bus, RefreshCw, LogIn, Loader2 } from 'lucide-react';

export default function PainelPublico() {
  const { eventoId: paramEventoId } = useParams();
  const navigate = useNavigate();
  const { eventos, loading } = useEventosPublicos();
  const [selectedEvento, setSelectedEvento] = useState<string | null>(paramEventoId || null);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-select first event or use URL param
  useEffect(() => {
    if (!loading && eventos.length > 0) {
      if (paramEventoId) {
        setSelectedEvento(paramEventoId);
      } else if (!selectedEvento) {
        setSelectedEvento(eventos[0].id);
      }
    }
  }, [loading, eventos, paramEventoId, selectedEvento]);

  const handleEventoChange = (value: string) => {
    setSelectedEvento(value);
    navigate(`/painel/${value}`, { replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const selectedEventoName = eventos.find(e => e.id === selectedEvento)?.nome_planilha;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bus className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold">Próximas Viagens</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  Entrar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {eventos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bus className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum evento disponível no momento</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Selecione o evento
              </label>
              <Select value={selectedEvento || ''} onValueChange={handleEventoChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um evento" />
                </SelectTrigger>
                <SelectContent>
                  {eventos.map((evento) => (
                    <SelectItem key={evento.id} value={evento.id}>
                      {evento.nome_planilha}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event name display */}
            {selectedEventoName && (
              <div className="text-center">
                <h2 className="text-xl font-bold">{selectedEventoName}</h2>
                <p className="text-sm text-muted-foreground">
                  Viagens de hoje • Atualização em tempo real
                </p>
              </div>
            )}

            {/* Trips list */}
            <ProximasViagens eventoId={selectedEvento} />
          </div>
        )}
      </main>
    </div>
  );
}
