import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface EventLayoutProps {
  children: ReactNode;
  mobileComponent?: ReactNode;
}

export function EventLayout({ children, mobileComponent }: EventLayoutProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });

  // Se for mobile e tiver um componente mobile, renderiza ele
  if (isMobile && mobileComponent) {
    return <>{mobileComponent}</>;
  }

  // Versão desktop com sidebar
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
