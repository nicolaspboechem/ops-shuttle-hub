import { Car, Bus, Plus, MapPin, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SupervisorTabId = 'frota' | 'viagens' | 'nova' | 'localizador' | 'historico';

interface NavTab {
  id: SupervisorTabId;
  label: string;
  icon: React.ElementType;
  isAction?: boolean;
}

const tabs: NavTab[] = [
  { id: 'frota', label: 'Frota', icon: Car },
  { id: 'viagens', label: 'Viagens', icon: Bus },
  { id: 'nova', label: 'Nova', icon: Plus, isAction: true },
  { id: 'localizador', label: 'Local', icon: MapPin },
  { id: 'historico', label: 'Histórico', icon: ClipboardList },
];

interface SupervisorBottomNavProps {
  activeTab: SupervisorTabId;
  onTabChange: (tab: SupervisorTabId) => void;
  habilitarLocalizador?: boolean;
}

export function SupervisorBottomNav({ activeTab, onTabChange, habilitarLocalizador = true }: SupervisorBottomNavProps) {
  const filteredTabs = habilitarLocalizador ? tabs : tabs.filter(t => t.id !== 'localizador');
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-primary safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          // Central action button (Nova)
          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex items-center justify-center -mt-6"
              >
                <div className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all bg-white text-primary active:scale-95">
                  <Icon className="h-6 w-6" />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors",
                isActive 
                  ? "text-primary-foreground" 
                  : "text-primary-foreground/70"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
