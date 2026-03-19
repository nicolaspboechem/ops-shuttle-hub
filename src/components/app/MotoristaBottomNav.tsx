import { Home, Car, ClipboardList, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MotoristaTabId = 'home' | 'inicio' | 'veiculo' | 'historico' | 'mais';

interface NavTab {
  id: MotoristaTabId;
  label: string;
  icon: React.ElementType;
}

const tabs: NavTab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'inicio', label: 'Missões', icon: ClipboardList },
  { id: 'veiculo', label: 'Veículo', icon: Car },
  { id: 'historico', label: 'Histórico', icon: ClipboardList },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
];

interface MotoristaBottomNavProps {
  activeTab: MotoristaTabId;
  onTabChange: (tab: MotoristaTabId) => void;
}

export function MotoristaBottomNav({ activeTab, onTabChange }: MotoristaBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-primary safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
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
