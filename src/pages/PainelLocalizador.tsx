import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalizadorMotoristas } from '@/hooks/useLocalizadorMotoristas';
import { LocalizadorColumn } from '@/components/localizador/LocalizadorColumn';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import logoAS from '@/assets/as_logo_reduzida_branca.png';

export default function PainelLocalizador() {
  const { eventoId } = useParams();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventoNome, setEventoNome] = useState('');
  
  const { 
    motoristasPorLocalizacao, 
    localizacoes, 
    loading, 
    refetch 
  } = useLocalizadorMotoristas(eventoId);

  // Fetch event name
  useEffect(() => {
    if (!eventoId) return;
    
    supabase
      .from('eventos')
      .select('nome_planilha')
      .eq('id', eventoId)
      .single()
      .then(({ data }) => {
        setEventoNome(data?.nome_planilha || '');
      });
  }, [eventoId]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const totalMotoristas = Object.values(motoristasPorLocalizacao).flat().length;
  const emTransito = motoristasPorLocalizacao['em_transito']?.length || 0;
  const disponiveis = Object.entries(motoristasPorLocalizacao)
    .filter(([key]) => key !== 'em_transito' && key !== 'sem_local')
    .flatMap(([, arr]) => arr)
    .filter(m => m.status === 'disponivel').length;

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
      <header className="bg-card/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <img src={logoAS} alt="AS Brasil" className="h-10" />
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">LOCALIZADOR DE FROTA</h1>
                {eventoNome && (
                  <p className="text-sm text-muted-foreground">{eventoNome}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{totalMotoristas}</div>
              <div className="text-xs text-muted-foreground uppercase">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{disponiveis}</div>
              <div className="text-xs text-muted-foreground uppercase">Disponíveis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{emTransito}</div>
              <div className="text-xs text-muted-foreground uppercase">Em Trânsito</div>
            </div>
          </div>

          {/* Clock */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-foreground">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm text-muted-foreground">
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
