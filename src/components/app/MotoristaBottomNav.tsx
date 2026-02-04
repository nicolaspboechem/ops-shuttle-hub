import { Home, Car, Plus, ClipboardList, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MotoristaTabId = 'inicio' | 'veiculo' | 'corrida' | 'historico' | 'mais';

interface NavTab {
  id: MotoristaTabId;
  label: string;
  icon: React.ElementType;
}

const tabs: NavTab[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'veiculo', label: 'Veículo', icon: Car },
  { id: 'corrida', label: 'Corrida', icon: Plus },
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
          
          // Special styling for the center "Corrida" button
          if (tab.id === 'corrida') {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg transition-colors bg-white text-primary">
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
