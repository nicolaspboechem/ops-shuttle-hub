import { Bus, Users, Plus, ClipboardList, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OperadorTabId = 'viagens' | 'motoristas' | 'nova' | 'historico' | 'mais';

interface NavTab {
  id: OperadorTabId;
  label: string;
  icon: React.ElementType;
}

const tabs: NavTab[] = [
  { id: 'viagens', label: 'Viagens', icon: Bus },
  { id: 'motoristas', label: 'Motoristas', icon: Users },
  { id: 'nova', label: 'Nova', icon: Plus },
  { id: 'historico', label: 'Histórico', icon: ClipboardList },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
];

interface OperadorBottomNavProps {
  activeTab: OperadorTabId;
  onTabChange: (tab: OperadorTabId) => void;
}

export function OperadorBottomNav({ activeTab, onTabChange }: OperadorBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          // Botão central destacado para "Nova"
          if (tab.id === 'nova') {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/90 text-primary-foreground"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full nav-item-interactive rounded-lg",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
