import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MissaoKanbanColumnProps {
  id: string;
  title: string;
  count: number;
  accentColor: string;
  children: React.ReactNode;
}

export function MissaoKanbanColumn({ id, title, count, accentColor, children }: MissaoKanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-xl border border-border/50 min-w-[280px] max-w-[320px] w-full transition-colors",
        isOver && "bg-primary/5 border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", accentColor)} />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">
          {count}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)]">
        <div className="p-2 space-y-2 min-h-[60px]">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}
