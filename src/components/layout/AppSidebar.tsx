import { useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  CheckCircle, 
  Users, 
  Truck,
  Settings,
  LogOut,
  ArrowLeft,
  FileBarChart
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEventos } from '@/hooks/useEventos';

export function AppSidebar() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { signOut } = useAuth();
  const { getEventoById } = useEventos();
  const navigate = useNavigate();

  const evento = eventoId ? getEventoById(eventoId) : null;

  const navigation = [
    { name: 'Dashboard', href: `/evento/${eventoId}`, icon: LayoutDashboard },
    { name: 'Viagens Ativas', href: `/evento/${eventoId}/viagens-ativas`, icon: Bus },
    { name: 'Finalizadas', href: `/evento/${eventoId}/viagens-finalizadas`, icon: CheckCircle },
    { name: 'Motoristas', href: `/evento/${eventoId}/motoristas`, icon: Users },
    { name: 'Veículos', href: `/evento/${eventoId}/veiculos`, icon: Truck },
    { name: 'Pontos Embarque', href: `/evento/${eventoId}/pontos`, icon: Bus },
    { name: 'Auditoria', href: `/evento/${eventoId}/auditoria`, icon: FileBarChart },
    { name: 'Equipe', href: `/evento/${eventoId}/equipe`, icon: Users },
    { name: 'Painel Público', href: `/evento/${eventoId}/painel-config`, icon: LayoutDashboard },
  ];

  const bottomNav = [
    { name: 'Configurações', href: `/evento/${eventoId}/configuracoes`, icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <aside className="flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary">
          <Bus className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-sidebar-accent-foreground">Shuttle</h1>
          <p className="text-xs text-sidebar-foreground/60">Controle Operacional</p>
        </div>
      </div>

      {/* Event Info & Back Button */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <button
          onClick={() => navigate('/eventos')}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Eventos</span>
        </button>
        {evento && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <p className="text-xs text-sidebar-foreground/60 mb-1">Evento atual:</p>
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {evento.nome_planilha}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === `/evento/${eventoId}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
