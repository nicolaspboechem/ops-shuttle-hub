import { Users, UserCheck, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MotoristaStatusPanelProps {
  online: number;
  disponiveis: number;
  emTransito: number;
  totalCadastrados?: number;
  compact?: boolean;
}

interface IndicatorProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  dotClass: string;
}

function Indicator({ label, value, icon, colorClass, dotClass }: IndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClass)}>
        {icon}
      </div>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
        {label}
      </span>
    </div>
  );
}

export function MotoristaStatusPanel({ online, disponiveis, emTransito, totalCadastrados, compact }: MotoristaStatusPanelProps) {
  return (
    <Card>
      <CardContent className={cn("flex items-center justify-around", compact ? "p-3" : "p-4")}>
        <Indicator
          label="Online"
          value={online}
          icon={<Users className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />}
          colorClass="bg-emerald-100 dark:bg-emerald-900/40"
          dotClass="bg-emerald-500"
        />
        <div className="w-px h-10 bg-border" />
        <Indicator
          label="Disponíveis"
          value={disponiveis}
          icon={<UserCheck className="w-5 h-5 text-green-600 dark:text-green-300" />}
          colorClass="bg-green-100 dark:bg-green-900/40"
          dotClass="bg-green-500"
        />
        <div className="w-px h-10 bg-border" />
        <Indicator
          label="Em Trânsito"
          value={emTransito}
          icon={<Navigation className="w-5 h-5 text-blue-600 dark:text-blue-300" />}
          colorClass="bg-blue-100 dark:bg-blue-900/40"
          dotClass="bg-blue-500"
        />
        {totalCadastrados !== undefined && (
          <>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div className="hidden sm:flex flex-col items-center gap-1 flex-1">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{totalCadastrados}</span>
              <span className="text-[10px] text-muted-foreground">cadastrados</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
