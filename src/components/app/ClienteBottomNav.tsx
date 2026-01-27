import { BarChart3, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ClienteTabId = 'dashboard' | 'localizador' | 'painel';

interface ClienteBottomNavProps {
  activeTab: ClienteTabId;
  onTabChange: (tab: ClienteTabId) => void;
  availableTabs: ClienteTabId[];
}

const allTabs: { id: ClienteTabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'localizador', label: 'Localizador', icon: MapPin },
  { id: 'painel', label: 'Painel', icon: Clock },
];

export function ClienteBottomNav({ activeTab, onTabChange, availableTabs }: ClienteBottomNavProps) {
  const visibleTabs = allTabs.filter(t => availableTabs.includes(t.id));
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "text-primary"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
