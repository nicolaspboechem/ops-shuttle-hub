import { useState, useRef } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePanStart = () => {
    if (containerRef.current?.scrollTop === 0) {
      setIsPulling(true);
    }
  };

  const handlePan = (_: any, info: PanInfo) => {
    if (!isPulling || isRefreshing) return;
    
    // Só permite puxar para baixo quando no topo
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const distance = Math.max(0, info.offset.y);
    // Efeito de resistência - quanto mais puxa, mais resistência
    const dampedDistance = Math.min(distance * 0.5, PULL_THRESHOLD + 20);
    setPullDistance(dampedDistance);
  };

  const handlePanEnd = async () => {
    if (!isPulling || isRefreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = progress * 180;

  return (
    <div className="relative h-full overflow-hidden">
      {/* Indicador de Pull */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ top: pullDistance - 50 }}
        animate={{ opacity: pullDistance > 10 ? 1 : 0 }}
      >
        <div className="bg-background rounded-full p-2 shadow-lg border">
          <motion.div
            animate={{ 
              rotate: isRefreshing ? 360 : rotation,
            }}
            transition={{ 
              rotate: isRefreshing 
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : { duration: 0 }
            }}
          >
            <RefreshCw 
              className={`h-5 w-5 ${
                progress >= 1 || isRefreshing 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`} 
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Conteúdo com gesture */}
      <motion.div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{ 
          touchAction: 'pan-y',
          transform: `translateY(${pullDistance}px)` 
        }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
