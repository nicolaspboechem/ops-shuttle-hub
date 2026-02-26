import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Evento } from '@/lib/types/viagem';
import { Bus, LogOut, Loader2, ChevronRight, MapPin, Calendar, LayoutDashboard, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { Badge } from '@/components/ui/badge';

interface EventoWithCount extends Evento {
  viagensAtivas?: number;
}

export default function AppHome() {
  const { user, signOut, profile, isAdmin, getEventRole } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'motorista' | 'operador' | 'supervisor' | 'cliente' | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchEventos();
  }, [user, navigate, isAdmin]);

  const fetchEventos = async () => {
    if (!user) return;

    if (isAdmin) {
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'ativo')
        .order('data_criacao', { ascending: false });
      
      // Fetch active trips count for each event
      const eventosWithCounts = await fetchViagensCount(data || []);
      
      setEventos(eventosWithCounts);
      setLoading(false);
    } else {
      const { data: linkedEvents, error } = await supabase
        .from('evento_usuarios')
        .select('evento_id, role')
        .eq('user_id', user.id);

      if (error || !linkedEvents || linkedEvents.length === 0) {
        setEventos([]);
        setLoading(false);
        return;
      }

      // Determine user's primary role
      const primaryRole = linkedEvents[0].role as 'motorista' | 'operador' | 'supervisor' | 'cliente';
      setUserRole(primaryRole);

      const eventIds = linkedEvents.map(e => e.evento_id);
      
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'ativo')
        .in('id', eventIds)
        .order('data_criacao', { ascending: false });
      
      // Fetch active trips count for each event
      const eventosWithCounts = await fetchViagensCount(data || []);
      
      setEventos(eventosWithCounts);
      
      // Auto-redirect for non-admin with 1 event
      if (eventosWithCounts && eventosWithCounts.length === 1) {
        navigate(`/app/${eventosWithCounts[0].id}`);
        return;
      }
      
      setLoading(false);
    }
  };

  const fetchViagensCount = async (eventosData: Evento[]): Promise<EventoWithCount[]> => {
    if (eventosData.length === 0) return [];

    const eventIds = eventosData.map(e => e.id);
    
    // Fetch count of active trips (not encerrado) for each event
    const { data: viagens } = await supabase
      .from('viagens')
      .select('evento_id')
      .in('evento_id', eventIds)
      .or('encerrado.is.null,encerrado.eq.false');

    // Count trips per event
    const countMap: Record<string, number> = {};
    viagens?.forEach(v => {
      if (v.evento_id) {
        countMap[v.evento_id] = (countMap[v.evento_id] || 0) + 1;
      }
    });

    return eventosData.map(evento => ({
      ...evento,
      viagensAtivas: countMap[evento.id] || 0
    }));
  };

  const handleSelectEvento = (evento: Evento) => {
    navigate(`/app/${evento.id}`);
  };

  const handleCCO = () => {
    navigate('/eventos');
  };

  const getDateRange = (evento: Evento) => {
    if (evento.data_inicio && evento.data_fim) {
      const start = new Date(evento.data_inicio + 'T12:00:00');
      const end = new Date(evento.data_fim + 'T12:00:00');
      return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM', { locale: ptBR })}`;
    }
    return null;
  };

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrador';
    if (userRole === 'operador') return 'Operador';
    if (userRole === 'motorista') return 'Motorista';
    if (userRole === 'supervisor') return 'Supervisor';
    if (userRole === 'cliente') return 'Cliente';
    return null;
  };

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
      <header className="sticky top-0 z-50 bg-primary safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-primary-foreground">Controle Operacional</h1>
                  {getRoleLabel() && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-primary-foreground border-0">
                      {getRoleLabel()}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-primary-foreground/70">
                  {profile?.full_name || user?.email}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {eventos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bus className="h-20 w-20 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">Sem eventos vinculados</p>
            <p className="text-sm mt-1">Contate um administrador para ser adicionado a um evento.</p>
            {isAdmin && (
              <Button className="mt-4" onClick={handleCCO}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Acessar Painel CCO
              </Button>
            )}
          </div>
        ) : !isAdmin ? (
          /* Painel de Eventos para Operadores/Motoristas (múltiplos eventos) */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {userRole === 'operador' ? 'Central de Operações' : 'Seus Eventos'}
              </h2>
              <p className="text-muted-foreground">
                {userRole === 'operador' 
                  ? 'Selecione um evento para gerenciar' 
                  : 'Selecione um evento para operar'}
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {eventos.map((evento) => {
                const role = getEventRole(evento.id);
                return (
                  <Card 
                    key={evento.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden group"
                    onClick={() => handleSelectEvento(evento)}
                  >
                    {evento.imagem_banner ? (
                      <div className="aspect-[3/1] overflow-hidden">
                        <img
                          src={evento.imagem_banner}
                          alt={evento.nome_planilha}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/1] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Bus className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{evento.nome_planilha}</h3>
                          {evento.local && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{evento.local}</span>
                            </div>
                          )}
                          {getDateRange(evento) && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>{getDateRange(evento)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={role === 'operador' ? 'default' : 'secondary'} className="text-xs">
                            {role || 'motorista'}
                          </Badge>
                          {evento.viagensAtivas !== undefined && evento.viagensAtivas > 0 && (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              <Activity className="h-3 w-3 mr-1" />
                              {evento.viagensAtivas} ativa{evento.viagensAtivas !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : isAdmin ? (
          /* Grid de Eventos para Admin */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Eventos Ativos</h2>
              <p className="text-muted-foreground">Selecione um evento para operar</p>
            </div>
            
            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-primary/30 bg-primary/5"
              onClick={handleCCO}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Painel CCO</h4>
                  <p className="text-sm text-muted-foreground">
                    Acesso administrativo completo
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {eventos.map((evento) => (
                <Card 
                  key={evento.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden"
                  onClick={() => handleSelectEvento(evento)}
                >
                  {evento.imagem_banner && (
                    <div className="aspect-[3/1] overflow-hidden">
                      <img
                        src={evento.imagem_banner}
                        alt={evento.nome_planilha}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{evento.nome_planilha}</h3>
                        {evento.local && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{evento.local}</span>
                          </div>
                        )}
                        {getDateRange(evento) && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{getDateRange(evento)}</span>
                          </div>
                        )}
                      </div>
                      {evento.viagensAtivas !== undefined && evento.viagensAtivas > 0 && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <Activity className="h-3 w-3 mr-1" />
                          {evento.viagensAtivas} ativa{evento.viagensAtivas !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
