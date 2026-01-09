import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Car, Link2, User, Fuel } from "lucide-react";
import { VeiculoStatusBadge, FuelIndicator, AvariaIndicator } from "./VeiculoStatusBadge";
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

interface VeiculoKanbanCardProps {
  veiculo: Veiculo;
  isSelected?: boolean;
  onSelect?: () => void;
  showLinkButton?: boolean;
  isLinked?: boolean;
}

export function VeiculoKanbanCard({ 
  veiculo, 
  isSelected, 
  onSelect,
  showLinkButton = true,
  isLinked = false
}: VeiculoKanbanCardProps) {
  const TipoIcon = veiculo.tipo_veiculo?.toLowerCase().includes('van') ? Car : Bus;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-2",
        isSelected && "border-primary ring-2 ring-primary/20",
        isLinked && "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
        !isSelected && !isLinked && "border-transparent hover:border-muted-foreground/20"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Tipo + Placa */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <TipoIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{veiculo.tipo_veiculo}</p>
              <p className="font-bold text-lg tracking-wider">{veiculo.placa}</p>
            </div>
          </div>
          <VeiculoStatusBadge status={veiculo.status} size="sm" />
        </div>

        {/* Indicadores */}
        <div className="flex items-center gap-3 flex-wrap">
          <FuelIndicator level={veiculo.nivel_combustivel} size="sm" />
          <AvariaIndicator hasAvarias={veiculo.possui_avarias} size="sm" />
          {veiculo.capacidade && (
            <span className="text-xs text-muted-foreground">
              {veiculo.capacidade} lugares
            </span>
          )}
        </div>

        {/* Fornecedor */}
        {veiculo.fornecedor && (
          <p className="text-xs text-muted-foreground truncate">
            Fornecedor: {veiculo.fornecedor}
          </p>
        )}

        {/* Motorista vinculado (se houver) */}
        {veiculo.motorista_nome && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <User className="h-3 w-3" />
            <span className="truncate">{veiculo.motorista_nome}</span>
          </div>
        )}

        {/* Botão de vincular */}
        {showLinkButton && onSelect && (
          <Button 
            size="sm" 
            className="w-full mt-2"
            variant={isSelected ? "default" : "outline"}
          >
            <Link2 className="h-4 w-4 mr-2" />
            {isLinked ? "Veículo Atual" : isSelected ? "Selecionado" : "Vincular"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
