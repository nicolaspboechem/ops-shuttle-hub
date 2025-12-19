import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Calendar, Users, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/lib/auth/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { signOut, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const navigation = [
    { name: 'Eventos', href: '/eventos', icon: Calendar },
    { name: 'Usuários', href: '/usuarios', icon: Users, adminOnly: true },
  ];

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0 transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary flex-shrink-0">
            <Bus className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold text-sidebar-accent-foreground">Shuttle</h1>
              <p className="text-xs text-sidebar-foreground/60">Controle Operacional</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNav.map((item) => (
            <NavLink key={item.name} to={item.href}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center px-2")}
              activeClassName="bg-sidebar-primary text-sidebar-primary-foreground">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && item.name}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          {!collapsed && profile && (
            <div className="px-3 py-2 mb-2">
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

      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-16" : "ml-64")}>
        {children}
      </main>
    </div>
  );
}
