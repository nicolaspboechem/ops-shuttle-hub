import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface EventLayoutProps {
  children: ReactNode;
}

export function EventLayout({ children }: EventLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
