import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface InnerSidebarSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface InnerSidebarProps {
  sections: InnerSidebarSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  storageKey?: string;
}

export function InnerSidebar({ 
  sections, 
  activeSection, 
  onSectionChange,
  storageKey = 'inner-sidebar-collapsed'
}: InnerSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      return stored === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(collapsed));
  }, [collapsed, storageKey]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "flex flex-col border-r bg-muted/30 transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-48"
      )}>
        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            const button = (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{section.label}</span>}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={section.id}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {section.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Toggle Button */}
        <div className="p-2 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  "w-full justify-center",
                  !collapsed && "justify-start"
                )}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    <span className="text-xs">Recolher</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={10}>
                Expandir menu
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
