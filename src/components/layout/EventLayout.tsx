import { ReactNode, useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';

interface EventLayoutProps {
  children: ReactNode;
}

export function EventLayout({ children }: EventLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <main className={cn(
        "flex-1 transition-all duration-300",
        collapsed ? "ml-16" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
