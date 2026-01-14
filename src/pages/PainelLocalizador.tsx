import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, RefreshCw, Search, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalizadorMotoristas } from '@/hooks/useLocalizadorMotoristas';
import { useEventosMissoes } from '@/hooks/useEventosMissoes';
import { LocalizadorColumn } from '@/components/localizador/LocalizadorColumn';
import { EventosGrid } from '@/components/public/EventosGrid';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import logoAS from '@/assets/as_logo_reduzida_branca.png';

export default function PainelLocalizador() {
  const { eventoId: paramEventoId } = useParams();
  const navigate = useNavigate();
  const [selectedEvento, setSelectedEvento] = useState<string | null>(paramEventoId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventoNome, setEventoNome] = useState('');
  
  const { eventos, loading: loadingEventos } = useEventosMissoes();
  const { 
    motoristasPorLocalizacao, 
    localizacoes, 
    loading, 
    refetch 
  } = useLocalizadorMotoristas(selectedEvento || undefined);

  // Sync with URL param
  useEffect(() => {
    if (paramEventoId) {
      setSelectedEvento(paramEventoId);
    }
  }, [paramEventoId]);

  // Fetch event name
  useEffect(() => {
    if (!selectedEvento) return;
    
    supabase
      .from('eventos')
      .select('nome_planilha')
      .eq('id', selectedEvento)
      .single()
      .then(({ data }) => {
        setEventoNome(data?.nome_planilha || '');
      });
  }, [selectedEvento]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!selectedEvento) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch, selectedEvento]);

  const handleSelectEvento = (id: string) => {
    setSelectedEvento(id);
    navigate(`/localizador/${id}`, { replace: true });
  };

  const handleBack = () => {
    setSelectedEvento(null);
    setEventoNome('');
    navigate('/localizador', { replace: true });
  };

  // Filter events by search
  const filteredEventos = eventos.filter(evento =>
    evento.nome_planilha.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evento.descricao?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // EVENT SELECTION VIEW
  if (!selectedEvento) {
    if (loadingEventos) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <header className="bg-[#100014] px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <img src={logoAS} alt="AS Brasil" className="h-10" />
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-[#3F5AEC]" />
                <div>
                  <h1 className="text-xl font-bold text-white">LOCALIZADOR DE FROTA</h1>
                  <p className="text-sm text-white/70">Selecione um evento</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Buscar evento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {filteredEventos.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nenhum evento encontrado
              </h2>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Tente buscar por outro termo' 
                  : 'Não há eventos públicos disponíveis no momento'}
              </p>
            </div>
          ) : (
            <EventosGrid
              eventos={filteredEventos}
              onSelect={handleSelectEvento}
            />
          )}
        </main>
      </div>
    );
  }

  // KANBAN VIEW (existing functionality)
  const allMotoristas = Object.values(motoristasPorLocalizacao).flat();
  const totalMotoristas = allMotoristas.length;
  const emTransito = motoristasPorLocalizacao['em_transito']?.length || 0;
  // Contar TODOS os motoristas com status 'disponivel', independente da localização
  const disponiveis = allMotoristas.filter(m => m.status === 'disponivel').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="bg-[#100014] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            {eventos.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="mr-2 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <img src={logoAS} alt="AS Brasil" className="h-10" />
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-[#3F5AEC]" />
              <div>
                <h1 className="text-xl font-bold text-white">LOCALIZADOR DE FROTA</h1>
                {eventoNome && (
                  <p className="text-sm text-white/70">{eventoNome}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalMotoristas}</div>
              <div className="text-xs text-white/60 uppercase">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3F5AEC]">{disponiveis}</div>
              <div className="text-xs text-white/60 uppercase">Disponíveis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{emTransito}</div>
              <div className="text-xs text-white/60 uppercase">Em Trânsito</div>
            </div>
          </div>

          {/* Clock */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-white">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm text-[#3F5AEC]">
              {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Grid */}
      <div className="flex-1 p-6 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex gap-4 h-[calc(100vh-160px)] pb-4">
            {/* Location columns */}
            {localizacoes.map(local => (
              <LocalizadorColumn
                key={local}
                titulo={local}
                motoristas={motoristasPorLocalizacao[local] || []}
                tipo="local"
              />
            ))}

            {/* Em Trânsito column */}
            {motoristasPorLocalizacao['em_transito']?.length > 0 && (
              <LocalizadorColumn
                titulo="Em Trânsito"
                motoristas={motoristasPorLocalizacao['em_transito']}
                tipo="em_transito"
              />
            )}

            {/* Sem Localização column */}
            {motoristasPorLocalizacao['sem_local']?.length > 0 && (
              <LocalizadorColumn
                titulo="Sem Localização"
                motoristas={motoristasPorLocalizacao['sem_local']}
                tipo="sem_local"
              />
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Footer with last update */}
      <footer className="bg-card/50 border-t border-border px-6 py-2 text-center">
        <span className="text-xs text-muted-foreground">
          Atualização automática a cada 30 segundos • Última atualização: {format(currentTime, 'HH:mm:ss')}
        </span>
      </footer>
    </div>
  );
}
