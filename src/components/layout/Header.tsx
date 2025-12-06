import { Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdate?: Date;
  alertCount?: number;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, lastUpdate, alertCount = 0, onRefresh }: HeaderProps) {
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

        <Button variant="outline" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-status-critical text-status-critical-foreground">
              {alertCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
}
