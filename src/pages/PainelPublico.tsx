import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventosPublicos } from '@/hooks/useEventosPublicos';
import { useRotasPublicas } from '@/hooks/useRotasPublicas';
import { EventosGrid } from '@/components/public/EventosGrid';
import { EventoHero } from '@/components/public/EventoHero';
import { RotaCard } from '@/components/public/RotaCard';
import { Input } from '@/components/ui/input';
import { Bus, Loader2, Search, Route } from 'lucide-react';
import { rotaEstaAtiva } from '@/lib/utils/calcularProximasSaidas';
import asLogo from '@/assets/as_logo_reduzida_preta.png';

export default function PainelPublico() {
  const { eventoId: paramEventoId } = useParams();
  const navigate = useNavigate();
  const { eventos, loading } = useEventosPublicos();
  const [selectedEvento, setSelectedEvento] = useState<string | null>(paramEventoId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { rotas, loading: loadingRotas } = useRotasPublicas(selectedEvento);

  const evento = eventos.find(e => e.id === selectedEvento);
  
  // Atualiza o horário atual a cada 60 segundos para recalcular rotas ativas
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 segundos
    
    return () => clearInterval(interval);
  }, []);
  
  // Filtra apenas rotas que ainda estão ativas baseado no horário atual
  const rotasAtivas = useMemo(() => {
    return rotas.filter(rota => rotaEstaAtiva(rota.horario_fim, currentTime));
  }, [rotas, currentTime]);

  useEffect(() => {
    if (paramEventoId) {
      setSelectedEvento(paramEventoId);
    }
  }, [paramEventoId]);

  const handleSelectEvento = (id: string) => {
    setSelectedEvento(id);
    navigate(`/painel/${id}`, { replace: true });
  };

  const handleBack = () => {
    setSelectedEvento(null);
    navigate('/painel', { replace: true });
  };


  const filteredEventos = eventos.filter(e =>
    e.nome_planilha.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <img src={asLogo} alt="AS Brasil" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">AS Brasil</h1>
                <p className="text-xs text-muted-foreground">Logística de Transporte e Hospitalidade para Eventos</p>
              </div>
            </div>

            {/* Search */}
            {!selectedEvento && eventos.length > 1 && (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar evento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {/* Spacer para manter o layout */}
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {eventos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bus className="h-20 w-20 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">Nenhum evento disponível</p>
            <p className="text-sm mt-1">Volte mais tarde para conferir os eventos</p>
          </div>
        ) : !selectedEvento ? (
          /* Grid de Eventos */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Eventos Disponíveis</h2>
              <p className="text-muted-foreground">Selecione um evento para ver as rotas de transporte</p>
            </div>
            <EventosGrid
              eventos={filteredEventos}
              onSelect={handleSelectEvento}
            />
          </div>
        ) : (
          /* Detalhes do Evento */
          <div className="space-y-6">
            <EventoHero
              nome={evento?.nome_planilha || ''}
              descricao={evento?.descricao}
              imagemBanner={evento?.imagem_banner}
              imagemLogo={evento?.imagem_logo}
              dataInicio={evento?.data_inicio}
              dataFim={evento?.data_fim}
              onBack={eventos.length > 1 ? handleBack : undefined}
            />

            {/* Rotas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Rotas Disponíveis</h2>
              </div>

              {loadingRotas ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : rotasAtivas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma rota disponível no momento</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rotasAtivas.map((rota) => (
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
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
