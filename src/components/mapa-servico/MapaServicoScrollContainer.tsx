import { useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MapaServicoScrollContainerProps {
  children: ReactNode;
}

export function MapaServicoScrollContainer({ children }: MapaServicoScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  return (
    <div className="relative flex-1 min-h-0">
      {/* Left gradient + arrow */}
      {canScrollLeft && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Right gradient + arrow */}
      {canScrollRight && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-3 p-4 overflow-x-auto h-full min-h-0 scrollbar-thin"
      >
        {children}
      </div>
    </div>
  );
}
