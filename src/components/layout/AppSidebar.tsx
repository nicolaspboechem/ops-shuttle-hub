import { useState, useEffect } from 'react';
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
  FileBarChart,
  Eye,
  Route,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEventos } from '@/hooks/useEventos';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoASBranca from '@/assets/as_logo_reduzida_branca.png';

interface AppSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AppSidebar({ collapsed: controlledCollapsed, onCollapsedChange }: AppSidebarProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { signOut } = useAuth();
  const { getEventoById } = useEventos();
  const navigate = useNavigate();
  
  // Use localStorage to persist collapsed state
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });
  
  const collapsed = controlledCollapsed ?? internalCollapsed;
  
  const setCollapsed = (value: boolean) => {
    setInternalCollapsed(value);
    localStorage.setItem('sidebar-collapsed', String(value));
    onCollapsedChange?.(value);
  };

  const evento = eventoId ? getEventoById(eventoId) : null;

  // Seções organizadas logicamente
  const sections = [
    {
      title: 'Monitoramento',
      items: [
        { name: 'Dashboard', href: `/evento/${eventoId}/dashboard`, icon: LayoutDashboard },
        { name: 'Viagens Ativas', href: `/evento/${eventoId}/viagens-ativas`, icon: Bus },
        { name: 'Finalizadas', href: `/evento/${eventoId}/viagens-finalizadas`, icon: CheckCircle },
      ]
    },
    {
      title: 'Cadastros',
      items: [
        { name: 'Motoristas', href: `/evento/${eventoId}/motoristas`, icon: Users },
        { name: 'Veículos', href: `/evento/${eventoId}/veiculos`, icon: Truck },
        { name: 'Rotas Shuttle', href: `/evento/${eventoId}/rotas-shuttle`, icon: Route },
      ]
    },
    {
      title: 'Análise',
      items: [
        { name: 'Auditoria', href: `/evento/${eventoId}/auditoria`, icon: FileBarChart },
      ]
    },
    {
      title: 'Administração',
      items: [
        { name: 'Equipe', href: `/evento/${eventoId}/equipe`, icon: Users },
        { name: 'Painel Público', href: `/evento/${eventoId}/painel-config`, icon: Eye },
      ]
    },
  ];

  const bottomNav = [
    { name: 'Configurações', href: `/evento/${eventoId}/configuracoes`, icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const NavItem = ({ item, isBottom = false }: { item: { name: string; href: string; icon: any }, isBottom?: boolean }) => {
    const content = (
      <NavLink
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-2"
        )}
        activeClassName={isBottom 
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
        }
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo with Collapse Toggle */}
      <div className={cn(
        "flex items-center gap-3 py-5 border-b border-sidebar-border transition-all relative",
        collapsed ? "px-3 justify-center" : "px-6"
      )}>
        <img 
          src={logoASBranca} 
          alt="AS Brasil" 
          className="w-10 h-10 object-contain shrink-0"
        />
        {!collapsed && (
          <div>
            <h1 className="text-lg font-semibold text-sidebar-accent-foreground">CCO</h1>
            <p className="text-xs text-sidebar-foreground/60">Centro de Controle Operacional</p>
          </div>
        )}
        
        {/* Circular Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center",
            "hover:bg-sidebar-accent transition-colors shadow-sm",
            collapsed ? "-right-3 top-1/2 -translate-y-1/2" : "-right-3 top-1/2 -translate-y-1/2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Event Info & Back Button */}
      <div className={cn(
        "py-3 border-b border-sidebar-border",
        collapsed ? "px-2" : "px-3"
      )}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/eventos')}
                className="flex items-center justify-center p-2 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Voltar para Eventos</TooltipContent>
          </Tooltip>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Navigation with Sections */}
      <nav className={cn(
        "flex-1 py-4 space-y-6 overflow-y-auto",
        collapsed ? "px-2" : "px-3"
      )}>
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className={cn(
        "py-4 border-t border-sidebar-border space-y-1",
        collapsed ? "px-2" : "px-3"
      )}>
        {bottomNav.map((item) => (
          <NavItem key={item.name} item={item} isBottom />
        ))}
        
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center p-2.5 rounded-lg w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        ) : (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        )}

      </div>
    </aside>
  );
}
