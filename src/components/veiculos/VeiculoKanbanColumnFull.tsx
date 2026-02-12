import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { VeiculoKanbanCardFull } from "./VeiculoKanbanCardFull";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

interface Veiculo {
  id: string;
  placa: string;
  tipo_veiculo: string;
  capacidade?: number | null;
  fornecedor?: string | null;
  status?: string | null;
  nivel_combustivel?: string | null;
  possui_avarias?: boolean | null;
  km_inicial?: number | null;
  km_final?: number | null;
  atualizado_por?: string | null;
  data_atualizacao?: string;
}

interface VeiculoStats {
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
  ativo: boolean;
}

interface VeiculoKanbanColumnFullProps {
  status: 'liberado' | 'pendente' | 'em_inspecao' | 'manutencao';
  veiculos: Veiculo[];
  veiculosStats: Map<string, VeiculoStats>;
  motoristas: Array<{ nome: string; veiculo_id: string | null }>;
  eventoId?: string;
  onSave: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any, oldPlaca: string) => Promise<void>;
  onDelete: (id: string) => void;
  getName?: (id: string) => string;
  onViewDetails?: (veiculoId: string) => void;
}

const statusConfig = {
  liberado: { title: 'Liberados', accentColor: 'bg-emerald-500' },
  pendente: { title: 'Pendentes', accentColor: 'bg-amber-500' },
  em_inspecao: { title: 'Em Inspeção', accentColor: 'bg-blue-500' },
  manutencao: { title: 'Manutenção', accentColor: 'bg-gray-500' },
};

export function VeiculoKanbanColumnFull({ 
  status, 
  veiculos, 
  veiculosStats,
  motoristas,
  eventoId,
  onSave,
  onUpdate,
  onDelete,
  getName,
  onViewDetails
}: VeiculoKanbanColumnFullProps) {
  const config = statusConfig[status];

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-xl border border-border/50 min-w-[300px] flex-1 transition-colors",
        isOver && "bg-primary/5 border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.accentColor)} />
        <span className="text-sm font-semibold text-foreground">{config.title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">
          {veiculos.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
        <div className="p-2 space-y-2 min-h-[60px]">
          {veiculos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum veículo
            </p>
          ) : (
            veiculos.map((veiculo) => {
              const stats = veiculosStats.get(veiculo.placa);
              const motoristaVinculado = motoristas.find(m => m.veiculo_id === veiculo.id);
              
              return (
                <VeiculoKanbanCardFull
                  key={veiculo.id}
                  veiculo={veiculo}
                  stats={stats}
                  motoristaVinculado={motoristaVinculado}
                  eventoId={eventoId}
                  onSave={onSave}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  getName={getName}
                  onViewDetails={onViewDetails}
                />
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
