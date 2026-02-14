import { ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  action: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Action reveal thresholds
  const actionThreshold = 80;
  const triggerThreshold = 160;

  // Transform opacity based on drag position
  const leftOpacity = useTransform(x, [0, actionThreshold], [0, 1]);
  const rightOpacity = useTransform(x, [-actionThreshold, 0], [1, 0]);
  
  // Transform scale for action icons
  const leftScale = useTransform(x, [0, actionThreshold, triggerThreshold], [0.5, 1, 1.2]);
  const rightScale = useTransform(x, [-triggerThreshold, -actionThreshold, 0], [1.2, 1, 0.5]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (disabled) return;

    if (info.offset.x > triggerThreshold && rightAction) {
      rightAction.action();
    } else if (info.offset.x < -triggerThreshold && leftAction) {
      leftAction.action();
    }
  };

  if (disabled || (!leftAction && !rightAction)) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action (revealed when swiping right) */}
      {rightAction && (
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start pl-4 w-24",
            rightAction.bgColor
          )}
          style={{ opacity: leftOpacity }}
        >
          <motion.div 
            className="flex flex-col items-center gap-1"
            style={{ scale: leftScale }}
          >
            <span className={rightAction.color}>{rightAction.icon}</span>
            <span className={cn("text-xs font-medium", rightAction.color)}>
              {rightAction.label}
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* Right action (revealed when swiping left) */}
      {leftAction && (
        <motion.div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-4 w-24",
            leftAction.bgColor
          )}
          style={{ opacity: rightOpacity }}
        >
          <motion.div 
            className="flex flex-col items-center gap-1"
            style={{ scale: rightScale }}
          >
            <span className={leftAction.color}>{leftAction.icon}</span>
            <span className={cn("text-xs font-medium", leftAction.color)}>
              {leftAction.label}
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn("relative z-10 bg-background", className)}
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
