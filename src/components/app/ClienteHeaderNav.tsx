import { BarChart3, MapPin, Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { ClienteTabId } from './ClienteBottomNav';

interface ClienteHeaderNavProps {
  eventoNome?: string;
  activeTab: ClienteTabId;
  onTabChange: (tab: ClienteTabId) => void;
  availableTabs: ClienteTabId[];
  onLogout: () => void;
}

const tabConfig: Record<ClienteTabId, { label: string; icon: React.ElementType }> = {
  dashboard: { label: 'Dashboard', icon: BarChart3 },
  localizador: { label: 'Localizador', icon: MapPin },
  painel: { label: 'Painel', icon: Clock },
};

export function ClienteHeaderNav({ 
  eventoNome, 
  activeTab, 
  onTabChange, 
  availableTabs,
  onLogout
}: ClienteHeaderNavProps) {
  return (
    <header className="sticky top-0 z-50 bg-primary safe-area-top">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo e evento */}
          <div className="flex items-center gap-4">
            <img src={logoAS} alt="AS Brasil" className="h-8" />
            <div className="hidden sm:block">
              <h1 className="font-semibold text-sm text-primary-foreground">{eventoNome || 'Carregando...'}</h1>
              <Badge variant="secondary" className="text-[10px] bg-white/20 text-primary-foreground border-0">Cliente</Badge>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {availableTabs.map(tabId => {
              const config = tabConfig[tabId];
              const Icon = config.icon;
              const isActive = activeTab === tabId;
              
              return (
                <Button
                  key={tabId}
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange(tabId)}
                  className={cn(
                    "gap-2",
                    isActive 
                      ? "bg-white text-primary hover:bg-white/90" 
                      : "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </Button>
              );
            })}
          </div>
          
          {/* Logout */}
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
