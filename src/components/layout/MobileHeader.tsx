import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEventos } from '@/hooks/useEventos';
import logoAS from '@/assets/as_logo_reduzida_preta.png';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export function MobileHeader({ title, subtitle, showBack = false, rightContent }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { eventoId } = useParams<{ eventoId: string }>();
  const { signOut } = useAuth();
  const { getEventoById } = useEventos();

  const evento = eventoId ? getEventoById(eventoId) : null;

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <img src={logoAS} alt="AS Brasil" className="w-8 h-8 object-contain" />
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {rightContent}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/eventos')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Trocar Evento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/evento/${eventoId}/configuracoes`)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
