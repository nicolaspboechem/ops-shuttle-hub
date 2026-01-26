import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, Search, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEventosPublicos } from '@/hooks/useEventosPublicos';
import { EventosGrid } from '@/components/public/EventosGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoASHorizontal from '@/assets/logo_as_horizontal.png';
const Index = () => {
  const {
    user,
    loading: authLoading,
    isAdmin,
    eventRoles
  } = useAuth();
  const {
    eventos,
    loading: eventosLoading
  } = useEventosPublicos();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Redireciona usuários logados
  if (user && !authLoading) {
    if (isAdmin) return <Navigate to="/eventos" replace />;
    if (eventRoles.length > 0) return <Navigate to="/app" replace />;
  }

  // Filtra eventos pela busca
  const filteredEventos = eventos.filter(e => e.nome_planilha.toLowerCase().includes(searchQuery.toLowerCase()));

  // Loading state
  if (authLoading || eventosLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img alt="AS Brasil" className="h-10 object-contain" src="/lovable-uploads/8a6598a4-bc65-416b-8eee-c59af25d6bdb.png" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold leading-tight">CCO - AS Brasil</h1>
              <p className="text-xs text-muted-foreground">Centro de Controle Operacional</p>
            </div>
          </div>
          
          <Button onClick={() => navigate('/auth')} variant="outline" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Entrar
          </Button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {eventos.length === 0 ?
      // Estado vazio
      <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Nenhum evento disponível</h2>
            <p className="text-muted-foreground max-w-md">
              No momento não há eventos públicos ativos. Volte em breve para conferir as próximas operações.
            </p>
          </div> : <>
            {/* Título da seção */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Eventos Disponíveis</h2>
              <p className="text-muted-foreground">
                Selecione um evento para visualizar as rotas e horários de shuttle
              </p>
            </div>

            {/* Busca (apenas se houver mais de 1 evento) */}
            {eventos.length > 1 && <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar evento..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>}

            {/* Grid de eventos */}
            {filteredEventos.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                Nenhum evento encontrado para "{searchQuery}"
              </div> : <EventosGrid eventos={filteredEventos} onSelect={id => navigate(`/painel/${id}`)} />}
          </>}
      </main>
    </div>;
};
export default Index;