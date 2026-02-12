import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, LogOut, ChevronLeft, ChevronRight, HelpCircle, Home, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/lib/auth/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { NotificationsPanel } from '@/components/layout/NotificationsPanel';
import logoASBranca from '@/assets/as_logo_reduzida_branca.png';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { signOut, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('main-sidebar-collapsed');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('main-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const navigation = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Eventos', href: '/eventos', icon: Calendar },
    { name: 'Usuários', href: '/usuarios', icon: Users, adminOnly: true },
    { name: 'Suporte', href: '/suporte', icon: HelpCircle },
  ];

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex w-full bg-background">
        <aside className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0 transition-all duration-300 z-50",
          collapsed ? "w-16" : "w-64"
        )}>
          <div className={cn(
            "flex items-center gap-3 py-5 border-b border-sidebar-border",
            collapsed ? "px-3 justify-center" : "px-4"
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
          </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNav.map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <NavLink to={item.href}
                  className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center px-2")}
                  activeClassName="bg-sidebar-primary text-sidebar-primary-foreground">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && item.name}
                </NavLink>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
          {!collapsed && profile && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-sidebar-foreground/60">{isAdmin ? 'Admin' : 'Usuário'}</p>
            </div>
          )}
          <button onClick={handleLogout} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive", collapsed && "justify-center")}>
            <LogOut className="w-5 h-5" />
            {!collapsed && 'Sair'}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border flex items-center justify-center">
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

        <main className={cn("flex-1 transition-all duration-300 flex flex-col", collapsed ? "ml-16" : "ml-64")}>
          {/* Top header bar with notifications */}
          <div className="sticky top-0 z-40 bg-background border-b border-border px-6 py-3 flex items-center justify-end gap-3">
            <NotificationsPanel />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
