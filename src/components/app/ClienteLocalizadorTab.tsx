import { useState, useEffect, useMemo } from 'react';
import { useLocalizadorMotoristas } from '@/hooks/useLocalizadorMotoristas';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { LocalizadorColumn } from '@/components/localizador/LocalizadorColumn';
import { MapaServicoScrollContainer } from '@/components/mapa-servico/MapaServicoScrollContainer';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ClienteLocalizadorTabProps {
  eventoId: string;
}

export function ClienteLocalizadorTab({ eventoId }: ClienteLocalizadorTabProps) {
  const { motoristas, loading, refetch } = useLocalizadorMotoristas(eventoId);
  const { pontos } = usePontosEmbarque(eventoId);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [missoesAtivas, setMissoesAtivas] = useState<any[]>([]);

  // Fetch active missions
  useEffect(() => {
    const fetchMissoes = () => {
      supabase
        .from('missoes')
        .select('id, motorista_id, ponto_embarque, ponto_desembarque, status')
        .eq('evento_id', eventoId)
        .in('status', ['pendente', 'aceita', 'em_andamento'])
        .then(({ data }) => setMissoesAtivas(data || []));
    };
    fetchMissoes();

    const channel = supabase
      .channel('cliente-loc-missoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missoes' }, fetchMissoes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventoId]);

  const missoesPorMotorista = useMemo(() => {
    const map = new Map<string, typeof missoesAtivas[number]>();
    missoesAtivas.forEach(m => {
      const existing = map.get(m.motorista_id);
      if (!existing || m.status === 'em_andamento' || (m.status === 'aceita' && existing.status === 'pendente')) {
        map.set(m.motorista_id, m);
      }
    });
    return map;
  }, [missoesAtivas]);

  const handleRefresh = () => {
    refetch();
    setLastUpdate(new Date());
  };

  // Agrupa motoristas por localização
  const motoristasAgrupados = motoristas.reduce((acc, m) => {
    const loc = m.ultima_localizacao || 'Base';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(m);
    return acc;
  }, {} as Record<string, typeof motoristas>);

  // Motoristas em trânsito (status em_viagem OU missão em_andamento)
  const motoristasEmTransito = motoristas.filter(m => {
    if (m.status === 'em_viagem') return true;
    const missao = missoesPorMotorista.get(m.id);
    return missao?.status === 'em_andamento';
  });

  // IDs de motoristas em trânsito para excluir das colunas de localização
  const emTransitoIds = new Set(motoristasEmTransito.map(m => m.id));

  // Lista de localizações (pontos + Base)
  const localizacoes = ['Base', ...pontos.map(p => p.nome)];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Localizador de Frota</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {format(lastUpdate, 'HH:mm:ss')}
          </Badge>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban horizontal */}
      <MapaServicoScrollContainer>
        {motoristasEmTransito.length > 0 && (
          <LocalizadorColumn
            titulo="Em Trânsito"
            motoristas={motoristasEmTransito}
            tipo="em_transito"
            missoesPorMotorista={missoesPorMotorista}
          />
        )}

        {localizacoes.map(loc => {
          const mots = motoristasAgrupados[loc] || [];
          const motsDisponiveis = mots.filter(m => !emTransitoIds.has(m.id));
          
          return (
            <LocalizadorColumn
              key={loc}
              titulo={loc}
              motoristas={motsDisponiveis}
              tipo="local"
              missoesPorMotorista={missoesPorMotorista}
            />
          );
        })}
      </MapaServicoScrollContainer>

      {/* Empty state */}
      {motoristas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum motorista registrado</p>
        </div>
      )}
    </div>
  );
}
