import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationsPanel } from './NotificationsPanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdate?: Date;
  alertCount?: number;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, lastUpdate, onRefresh }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-card border-b border-border">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {lastUpdate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Última atualização:</span>
            <span className="font-medium">
              {lastUpdate.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}

        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        )}

        {/* Notifications Panel - Realtime for Admin */}
        <NotificationsPanel />
      </div>
    </header>
  );
}
