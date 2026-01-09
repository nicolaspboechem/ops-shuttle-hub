import { cn } from '@/lib/utils';
import { Fuel } from 'lucide-react';

interface CombustivelGaugeProps {
  value: string;
  onChange: (value: string) => void;
}

const NIVEIS = [
  { id: 'vazio', label: 'Vazio', percent: 0 },
  { id: '1/4', label: '1/4', percent: 25 },
  { id: '1/2', label: '1/2', percent: 50 },
  { id: '3/4', label: '3/4', percent: 75 },
  { id: 'cheio', label: 'Cheio', percent: 100 },
];

export function CombustivelGauge({ value, onChange }: CombustivelGaugeProps) {
  const selectedNivel = NIVEIS.find(n => n.id === value) || NIVEIS[0];

  return (
    <div className="space-y-4">
      {/* Gauge visual */}
      <div className="relative h-16 bg-muted rounded-xl overflow-hidden border border-border">
        <div 
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-300",
            selectedNivel.percent <= 25 && "bg-destructive",
            selectedNivel.percent > 25 && selectedNivel.percent <= 50 && "bg-warning",
            selectedNivel.percent > 50 && "bg-emerald-500"
          )}
          style={{ width: `${selectedNivel.percent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <Fuel className="h-5 w-5 text-foreground" />
          <span className="font-semibold text-foreground">
            {selectedNivel.label}
          </span>
        </div>
      </div>

      {/* Seletor de níveis */}
      <div className="grid grid-cols-5 gap-2">
        {NIVEIS.map((nivel) => (
          <button
            key={nivel.id}
            type="button"
            onClick={() => onChange(nivel.id)}
            className={cn(
              "py-2 px-1 text-xs font-medium rounded-lg border transition-all",
              value === nivel.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50"
            )}
          >
            {nivel.label}
          </button>
        ))}
      </div>
    </div>
  );
}
