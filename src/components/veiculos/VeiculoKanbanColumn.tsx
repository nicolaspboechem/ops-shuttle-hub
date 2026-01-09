import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, Loader, Wrench } from "lucide-react";
import { VeiculoKanbanCard } from "./VeiculoKanbanCard";
import { cn } from "@/lib/utils";

interface Veiculo {
  id: string;
  placa: string;
  tipo_veiculo: string;
  capacidade?: number | null;
  fornecedor?: string | null;
  status?: string | null;
  nivel_combustivel?: string | null;
  possui_avarias?: boolean | null;
  motorista_nome?: string | null;
}

interface VeiculoKanbanColumnProps {
  status: 'liberado' | 'pendente' | 'em_inspecao' | 'manutencao';
  veiculos: Veiculo[];
  onSelect?: (veiculoId: string) => void;
  selectedId?: string;
  currentVeiculoId?: string;
  showLinkButton?: boolean;
}

const statusConfig = {
  liberado: {
    title: 'Liberados',
    icon: CheckCircle,
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    headerColor: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  pendente: {
    title: 'Pendentes',
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    headerColor: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  em_inspecao: {
    title: 'Em Inspeção',
    icon: Loader,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    headerColor: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  manutencao: {
    title: 'Manutenção',
    icon: Wrench,
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    headerColor: 'bg-gray-100 dark:bg-gray-800/50',
    iconColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
};

export function VeiculoKanbanColumn({ 
  status, 
  veiculos, 
  onSelect, 
  selectedId,
  currentVeiculoId,
  showLinkButton = true
}: VeiculoKanbanColumnProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex flex-col rounded-xl border min-w-[280px] max-w-[320px] flex-1",
      config.bgColor,
      config.borderColor
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-t-xl border-b",
        config.headerColor,
        config.borderColor
      )}>
        <Icon className={cn("h-5 w-5", config.iconColor)} />
        <span className="font-semibold">{config.title}</span>
        <span className={cn(
          "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
          config.iconColor,
          "bg-white/50 dark:bg-black/20"
        )}>
          {veiculos.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {veiculos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum veículo
            </p>
          ) : (
            veiculos.map((veiculo) => (
              <VeiculoKanbanCard
                key={veiculo.id}
                veiculo={veiculo}
                isSelected={selectedId === veiculo.id}
                isLinked={currentVeiculoId === veiculo.id}
                onSelect={onSelect ? () => onSelect(veiculo.id) : undefined}
                showLinkButton={showLinkButton}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
