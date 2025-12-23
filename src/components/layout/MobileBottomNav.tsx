import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  CheckCircle, 
  Users, 
  MoreHorizontal 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
}

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventoId } = useParams<{ eventoId: string }>();

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, path: `/evento/${eventoId}/dashboard` },
    { name: 'Ativas', icon: Bus, path: `/evento/${eventoId}/viagens-ativas` },
    { name: 'Finalizadas', icon: CheckCircle, path: `/evento/${eventoId}/viagens-finalizadas` },
    { name: 'Motoristas', icon: Users, path: `/evento/${eventoId}/motoristas` },
    { name: 'Mais', icon: MoreHorizontal, path: `/evento/${eventoId}/configuracoes` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
