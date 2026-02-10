import { useDroppable } from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MotoristaKanbanCard } from "./MotoristaKanbanCard";
import { Motorista, Veiculo } from "@/hooks/useCadastros";
import { CheckCircle, Car, Clock, UserX, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface MotoristaMetricas {
  motorista: string;
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
}

interface MotoristaKanbanColumnProps {
  status: string;
  motoristas: Motorista[];
  veiculos: Veiculo[];
  metricas: MotoristaMetricas[];
  ultimasLocalizacoes: Record<string, string>;
  onDelete: (motoristaId: string) => void;
  onVincularVeiculo: (motoristaId: string) => void;
  onEdit: (motorista: Motorista) => void;
  onVerViagens?: (motorista: Motorista) => void;
  onEditLocalizacao?: (motorista: Motorista) => void;
}

interface StatusConfigItem {
  title: string;
  icon: LucideIcon;
  bgColor: string;
  headerBg: string;
  iconColor: string;
  borderColor: string;
}

const statusConfig: Record<string, StatusConfigItem> = {
  disponivel: {
    title: 'Disponíveis',
    icon: CheckCircle,
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    headerBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  em_viagem: {
    title: 'Em Viagem',
    icon: Car,
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    headerBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  indisponivel: {
    title: 'Indisponíveis',
    icon: Clock,
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    headerBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  inativo: {
    title: 'Inativos',
    icon: UserX,
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    headerBg: 'bg-gray-100 dark:bg-gray-900/40',
    iconColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
};

export function MotoristaKanbanColumn({ 
  status, 
  motoristas, 
  veiculos,
  metricas,
  ultimasLocalizacoes,
  onDelete,
  onVincularVeiculo,
  onEdit,
  onVerViagens,
  onEditLocalizacao
}: MotoristaKanbanColumnProps) {
  const config = statusConfig[status] || statusConfig.disponivel;
  const Icon = config.icon;

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getVeiculoDoMotorista = (motoristaId: string) => {
    const motorista = motoristas.find(m => m.id === motoristaId);
    if (motorista?.veiculo_id) {
      return veiculos.find(v => v.id === motorista.veiculo_id);
    }
    return undefined;
  };

  const getMetricasMotorista = (nomeMotorista: string) => {
    return metricas.find(m => m.motorista === nomeMotorista);
  };

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border min-w-[310px] max-w-[380px] flex-shrink-0 transition-all duration-200",
        config.borderColor,
        config.bgColor,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Header */}
      <div className={cn("p-3 rounded-t-lg", config.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", config.iconColor)} />
            <span className="font-semibold text-sm">{config.title}</span>
          </div>
          <motion.span
            key={motoristas.length}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              config.headerBg,
              config.iconColor
            )}
          >
            {motoristas.length}
          </motion.span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
        <div className="p-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {motoristas.length > 0 ? (
              motoristas.map((motorista) => (
                <MotoristaKanbanCard
                  key={motorista.id}
                  motorista={motorista}
                  metricas={getMetricasMotorista(motorista.nome)}
                  veiculo={getVeiculoDoMotorista(motorista.id)}
                  ultimaLocalizacao={ultimasLocalizacoes[motorista.nome] || (motorista as any).ultima_localizacao || undefined}
                  onDelete={() => onDelete(motorista.id)}
                  onVincularVeiculo={() => onVincularVeiculo(motorista.id)}
                  onEdit={() => onEdit(motorista)}
                  onVerViagens={onVerViagens ? () => onVerViagens(motorista) : undefined}
                  onEditLocalizacao={onEditLocalizacao ? () => onEditLocalizacao(motorista) : undefined}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                Nenhum motorista
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
