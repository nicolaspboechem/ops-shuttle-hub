import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TutorialStep } from '@/hooks/useTutorial';
import { X, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialPopoverProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

const HEADER_HEIGHT = 60;
const BOTTOM_NAV_HEIGHT = 80;
const POPOVER_HEIGHT = 200;
const GAP = 12;

export function TutorialPopover({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onSkip,
  onComplete,
}: TutorialPopoverProps) {
  const [position, setPosition] = useState({ y: 0 });
  const [calculatedPosition, setCalculatedPosition] = useState<'top' | 'bottom' | 'center'>('center');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculatePosition = () => {
      // Para posição center, não precisa de target
      if (step.position === 'center' || !step.targetSelector) {
        setCalculatedPosition('center');
        return;
      }

      const target = document.querySelector(step.targetSelector);
      if (!target) {
        setCalculatedPosition('center');
        return;
      }

      const rect = target.getBoundingClientRect();
      const availableTop = rect.top - HEADER_HEIGHT;
      const availableBottom = window.innerHeight - rect.bottom - BOTTOM_NAV_HEIGHT;

      // Priorizar posição que tenha mais espaço
      if (step.position === 'top' && availableTop >= POPOVER_HEIGHT) {
        setCalculatedPosition('top');
        setPosition({ y: rect.top });
      } else if (availableBottom >= POPOVER_HEIGHT) {
        setCalculatedPosition('bottom');
        setPosition({ y: rect.bottom });
      } else if (availableTop >= POPOVER_HEIGHT) {
        setCalculatedPosition('top');
        setPosition({ y: rect.top });
      } else {
        // Fallback para center se não couber
        setCalculatedPosition('center');
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [step]);

  const isLastStep = currentIndex === totalSteps - 1;

  // Calcular estilos de posição
  const getPositionStyles = () => {
    if (calculatedPosition === 'center') {
      return undefined; // Usa classes Tailwind
    }
    
    if (calculatedPosition === 'bottom') {
      return { top: `${position.y + GAP}px` };
    }
    
    if (calculatedPosition === 'top') {
      return { bottom: `${window.innerHeight - position.y + GAP}px` };
    }
    
    return undefined;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className="fixed inset-0 z-[100] pointer-events-none"
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 pointer-events-auto"
          onClick={onSkip}
        />

        {/* Popover */}
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.9, y: calculatedPosition === 'top' ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            "fixed pointer-events-auto",
            "w-[calc(100vw-32px)] max-w-[320px]",
            "left-1/2 -translate-x-1/2",
            calculatedPosition === 'center' && "top-1/2 -translate-y-1/2 mb-10"
          )}
          style={getPositionStyles()}
        >
          <Card className="shadow-2xl border-primary/20 overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <CardContent className="p-4">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onSkip}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Content */}
              <div className="pr-6 space-y-3">
                <h4 className="font-semibold text-lg leading-tight">{step.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} de {totalSteps}
                </span>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    className="text-muted-foreground"
                  >
                    Pular
                  </Button>
                  
                  {isLastStep ? (
                    <Button size="sm" onClick={onComplete} className="gap-1">
                      <Check className="h-4 w-4" />
                      Concluir
                    </Button>
                  ) : (
                    <Button size="sm" onClick={onNext} className="gap-1">
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arrow indicator */}
          {calculatedPosition !== 'center' && (
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border",
                calculatedPosition === 'top' && "bottom-[-6px] border-t-0 border-l-0",
                calculatedPosition === 'bottom' && "top-[-6px] border-b-0 border-r-0"
              )}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
