import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, RefreshCw, Search, ArrowLeft, Users, Navigation, Home, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalizadorMotoristas, MotoristaComVeiculo } from '@/hooks/useLocalizadorMotoristas';
import { useEventosLocalizador } from '@/hooks/useEventosLocalizador';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { LocalizadorColumn } from '@/components/localizador/LocalizadorColumn';
import { EventosGrid } from '@/components/public/EventosGrid';
import { MapaServicoScrollContainer } from '@/components/mapa-servico/MapaServicoScrollContainer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import logoAS from '@/assets/as_logo_reduzida_branca.png';

export default function PainelLocalizador() {
  const { eventoId: paramEventoId } = useParams();
  const navigate = useNavigate();
  const [selectedEvento, setSelectedEvento] = useState<string | null>(paramEventoId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventoNome, setEventoNome] = useState('');
  const [baseNome, setBaseNome] = useState('Base');
  const [outrosNome, setOutrosNome] = useState<string | null>(null);
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const [missoesAtivas, setMissoesAtivas] = useState<any[]>([]);
  
  const { offset, getAgoraSync } = useServerTime();
  const [currentTime, setCurrentTime] = useState(() => getAgoraSync());
  
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

  const [localizadorDesabilitado, setLocalizadorDesabilitado] = useState(false);

  // Fetch event name, horario_virada_dia and habilitar_localizador
  useEffect(() => {
    if (!selectedEvento) return;
    
    supabase
      .from('eventos')
      .select('nome_planilha, horario_virada_dia, habilitar_localizador')
      .eq('id', selectedEvento)
      .single()
      .then(({ data }) => {
        setEventoNome(data?.nome_planilha || '');
        setLocalizadorDesabilitado(data?.habilitar_localizador !== true);
        if (data?.horario_virada_dia) {
          setHorarioVirada(data.horario_virada_dia.substring(0, 5)); // "HH:mm"
        }
      });
  }, [selectedEvento]);

  // Fetch base name, "Outros" name, and active missions
  useEffect(() => {
    if (!selectedEvento) return;

    // Fetch pontos_embarque for base and outros
    supabase
      .from('pontos_embarque')
      .select('nome, eh_base')
      .eq('evento_id', selectedEvento)
      .then(({ data }) => {
        if (!data) return;
        const base = data.find(p => p.eh_base);
        if (base) setBaseNome(base.nome);
        const outros = data.find(p => p.nome.toLowerCase().includes('outros'));
        if (outros) setOutrosNome(outros.nome);
      });

    // Fetch active missions filtered by operational day
    const fetchMissoes = () => {
      const dataOp = getDataOperacional(new Date(Date.now() + offset), horarioVirada);
      supabase
        .from('missoes')
        .select('id, motorista_id, ponto_embarque, ponto_desembarque, status, created_at, horario_previsto, data_atualizacao')
        .eq('evento_id', selectedEvento)
        .in('status', ['pendente', 'aceita', 'em_andamento'])
        .or(`data_programada.eq.${dataOp},data_programada.is.null`)
        .then(({ data }) => {
          setMissoesAtivas(data || []);
        });
    };
    fetchMissoes();

    // Realtime for missions
    const channel = supabase
      .channel('localizador-missoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missoes' }, fetchMissoes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedEvento, horarioVirada, offset]);

  // Update clock every second using synced time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date(Date.now() + offset));
    }, 1000);

    return () => clearInterval(interval);
  }, [offset]);

  // Auto-refresh every 2 minutes (Realtime handles instant updates)
  useEffect(() => {
    if (!selectedEvento) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 120000);

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

  // Map active missions per driver (only aceita/em_andamento for location display)
  const statusPriority: Record<string, number> = { em_andamento: 3, aceita: 2, pendente: 1 };
  
  // Compare two missions: returns true if `a` should replace `existing`
  const missaoTemPrioridade = (a: typeof missoesAtivas[number], existing: typeof missoesAtivas[number]) => {
    const aPrio = statusPriority[a.status] || 0;
    const ePrio = statusPriority[existing.status] || 0;
    if (aPrio !== ePrio) return aPrio > ePrio;
    // Same status: prioritize by horario_previsto (earlier wins), fallback created_at
    if (a.horario_previsto && existing.horario_previsto) {
      return a.horario_previsto < existing.horario_previsto;
    }
    if (a.horario_previsto && !existing.horario_previsto) return true;
    if (!a.horario_previsto && existing.horario_previsto) return false;
    return a.created_at > existing.created_at; // instant: most recent wins
  };

  const missoesPorMotorista = useMemo(() => {
    const map = new Map<string, typeof missoesAtivas[number]>();
    missoesAtivas.forEach(m => {
      if (m.status === 'pendente') return;
      const existing = map.get(m.motorista_id);
      if (!existing || missaoTemPrioridade(m, existing)) {
        map.set(m.motorista_id, m);
      }
    });
    return map;
  }, [missoesAtivas]);

  // Pending missions: drivers with pendente and NO active (aceita/em_andamento) mission
  const missoesPendentes = useMemo(() => {
    const motoristasComAtiva = new Set<string>();
    missoesAtivas.forEach(m => {
      if (m.status === 'aceita' || m.status === 'em_andamento') {
        motoristasComAtiva.add(m.motorista_id);
      }
    });
    return missoesAtivas.filter(m => 
      m.status === 'pendente' && !motoristasComAtiva.has(m.motorista_id)
    );
  }, [missoesAtivas]);

  // Build fake MotoristaComVeiculo entries for pending missions column
  const motoristasPendentes = useMemo(() => {
    const allMotoristas = Object.values(motoristasPorLocalizacao).flat();
    const motoristasMap = new Map(allMotoristas.map(m => [m.id, m]));
    
    // Deduplicate: one entry per driver (most recent pending)
    const perDriver = new Map<string, typeof missoesAtivas[number]>();
    missoesPendentes.forEach(m => {
      const existing = perDriver.get(m.motorista_id);
      if (!existing || missaoTemPrioridade(m, existing)) {
        perDriver.set(m.motorista_id, m);
      }
    });

    return Array.from(perDriver.values())
      .map(m => motoristasMap.get(m.motorista_id))
      .filter(Boolean) as MotoristaComVeiculo[];
  }, [missoesPendentes, motoristasPorLocalizacao]);

  // Map pending missions for the pendentes column cards
  const missoesPendentesPorMotorista = useMemo(() => {
    const map = new Map<string, typeof missoesAtivas[number]>();
    missoesPendentes.forEach(m => {
      const existing = map.get(m.motorista_id);
      if (!existing || missaoTemPrioridade(m, existing)) {
        map.set(m.motorista_id, m);
      }
    });
    return map;
  }, [missoesPendentes]);

  // Identify drivers returning to base
  const retornandoBaseIds = useMemo(() => {
    const ids = new Set<string>();
    missoesPorMotorista.forEach((missao, motoristaId) => {
      if (missao.ponto_desembarque === baseNome && missao.status === 'em_andamento') {
        ids.add(motoristaId);
      }
    });
    return ids;
  }, [missoesPorMotorista, baseNome]);

  // Separate drivers into dynamic vs fixed groups
  const { dynamicMotoristas, retornandoBaseMotoristas, outrosMotoristas, dynamicLocalizacoes } = useMemo(() => {
    const retornando: MotoristaComVeiculo[] = [];
    const outros: MotoristaComVeiculo[] = [];
    const dynamicGroups: Record<string, MotoristaComVeiculo[]> = {};

    Object.entries(motoristasPorLocalizacao).forEach(([loc, drivers]) => {
      drivers.forEach(m => {
        const missao = missoesPorMotorista.get(m.id);
        const emTransitoPorMissao = missao?.status === 'em_andamento';
        const missaoEnvolveOutros = outrosNome && missao && ['aceita', 'em_andamento'].includes(missao.status) &&
          (missao.ponto_embarque === outrosNome || missao.ponto_desembarque === outrosNome);

        if (retornandoBaseIds.has(m.id)) {
          retornando.push(m);
        } else if (missaoEnvolveOutros) {
          outros.push(m);
        } else if (emTransitoPorMissao && loc !== 'em_transito') {
          if (!dynamicGroups['em_transito']) dynamicGroups['em_transito'] = [];
          dynamicGroups['em_transito'].push(m);
        } else if (outrosNome && m.ultima_localizacao === outrosNome && m.status !== 'em_viagem') {
          outros.push(m);
        } else {
          if (!dynamicGroups[loc]) dynamicGroups[loc] = [];
          dynamicGroups[loc].push(m);
        }
      });
    });

    const dynLocs = localizacoes.filter(loc => !(outrosNome && loc === outrosNome));

    return {
      dynamicMotoristas: dynamicGroups,
      retornandoBaseMotoristas: retornando,
      outrosMotoristas: outros,
      dynamicLocalizacoes: dynLocs,
    };
  }, [motoristasPorLocalizacao, retornandoBaseIds, outrosNome, localizacoes, missoesPorMotorista]);

  // Calculate stats for motoristas
  const stats = useMemo(() => {
    const totalMotoristas = Object.values(motoristasPorLocalizacao).flat().length;
    const emTransito = motoristasPorLocalizacao['em_transito']?.length || 0;
    const retornando = retornandoBaseMotoristas.length;
    const disponiveis = Object.entries(motoristasPorLocalizacao)
      .filter(([key]) => key !== 'em_transito' && key !== 'sem_local')
      .flatMap(([, arr]) => arr)
      .filter(m => m.status === 'disponivel').length;

    return { total: totalMotoristas, emTransito, disponiveis, retornando, pendentes: motoristasPendentes.length };
  }, [motoristasPorLocalizacao, retornandoBaseMotoristas, motoristasPendentes]);

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

  // Show disabled message if localizador is not enabled for this event
  if (localizadorDesabilitado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
        <header className="bg-[#100014] px-6 py-4">
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
                {eventoNome && <p className="text-sm text-white/70">{eventoNome}</p>}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Localizador desabilitado</h2>
            <p className="text-muted-foreground">
              O módulo de localização não está habilitado para este evento.
              <br />Ative nas Configurações do evento no CCO.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // KANBAN VIEW
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
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-white/70" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-white/60 uppercase">Motoristas</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.disponiveis}</div>
              <div className="text-xs text-white/60 uppercase">Disponíveis</div>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.emTransito}</div>
                <div className="text-xs text-white/60 uppercase">Em Trânsito</div>
              </div>
            </div>
            {stats.retornando > 0 && (
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-400" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{stats.retornando}</div>
                  <div className="text-xs text-white/60 uppercase">Retornando</div>
                </div>
              </div>
            )}
            {stats.pendentes > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{stats.pendentes}</div>
                  <div className="text-xs text-white/60 uppercase">Pendentes</div>
                </div>
              </div>
            )}
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
        <div className="flex h-[calc(100vh-160px)]">
          {/* Dynamic columns - scrollable */}
          <MapaServicoScrollContainer>
            {dynamicLocalizacoes.map(local => (
              <LocalizadorColumn
                key={local}
                titulo={local}
                motoristas={dynamicMotoristas[local] || []}
                tipo="local"
                missoesPorMotorista={missoesPorMotorista}
              />
            ))}

            {(dynamicMotoristas['em_transito']?.length || 0) > 0 && (
              <LocalizadorColumn
                titulo="Em Trânsito"
                motoristas={dynamicMotoristas['em_transito']}
                tipo="em_transito"
                missoesPorMotorista={missoesPorMotorista}
              />
            )}

            {(dynamicMotoristas['sem_local']?.length || 0) > 0 && (
              <LocalizadorColumn
                titulo="Sem Localização"
                motoristas={dynamicMotoristas['sem_local']}
                tipo="sem_local"
                missoesPorMotorista={missoesPorMotorista}
              />
            )}
          </MapaServicoScrollContainer>

          {/* Separator */}
          <div className="w-px bg-border shrink-0 mx-2" />

          {/* Fixed columns - always visible */}
          <div className="flex gap-4 shrink-0">
            {motoristasPendentes.length > 0 && (
              <LocalizadorColumn
                titulo="Missões Pendentes"
                motoristas={motoristasPendentes}
                tipo="pendente"
                isFixed
                missoesPorMotorista={missoesPendentesPorMotorista}
              />
            )}
            <LocalizadorColumn
              titulo={`Retornando pra ${baseNome}`}
              motoristas={retornandoBaseMotoristas}
              tipo="retornando_base"
              isFixed
              missoesPorMotorista={missoesPorMotorista}
            />
            {outrosNome && (
              <LocalizadorColumn
                titulo="Outros"
                motoristas={outrosMotoristas}
                tipo="outros"
                isFixed
                missoesPorMotorista={missoesPorMotorista}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer with last update */}
      <footer className="bg-card/50 border-t border-border px-6 py-2 text-center">
        <span className="text-xs text-muted-foreground">
          Atualização automática a cada 60 segundos • Última atualização: {format(currentTime, 'HH:mm:ss')}
        </span>
      </footer>
    </div>
  );
}
