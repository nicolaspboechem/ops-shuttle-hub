import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bus, Car, MoreVertical, Pencil, Trash2, Users, Clock, Gauge, UserCheck } from "lucide-react";
import { VeiculoStatusBadge, FuelIndicator, AvariaIndicator } from "./VeiculoStatusBadge";
import { VeiculoModal } from "@/components/cadastros/CadastroModals";
import { formatarMinutos } from "@/lib/utils/calculadores";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface VeiculoKanbanCardFullProps {
  veiculo: Veiculo;
  stats?: VeiculoStats | null;
  motoristaVinculado?: { nome: string } | null;
  eventoId?: string;
  onSave: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any, oldPlaca: string) => Promise<void>;
  onDelete: (id: string) => void;
  getName?: (id: string) => string;
}

export function VeiculoKanbanCardFull({ 
  veiculo, 
  stats,
  motoristaVinculado,
  eventoId,
  onSave,
  onUpdate,
  onDelete,
  getName
}: VeiculoKanbanCardFullProps) {
  const TipoIcon = veiculo.tipo_veiculo?.toLowerCase().includes('van') ? Car : Bus;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header: Tipo + Placa + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              veiculo.tipo_veiculo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            )}>
              <TipoIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{veiculo.tipo_veiculo}</p>
              <code className="font-bold text-base tracking-wider bg-muted px-1.5 py-0.5 rounded">{veiculo.placa}</code>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <VeiculoModal
                veiculo={veiculo as any}
                eventoId={eventoId}
                onSave={onSave}
                onUpdate={onUpdate}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                }
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O veículo {veiculo.placa} será removido permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(veiculo.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Indicadores de Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <VeiculoStatusBadge status={veiculo.status} size="sm" />
          <FuelIndicator level={veiculo.nivel_combustivel} size="sm" />
          <AvariaIndicator hasAvarias={veiculo.possui_avarias} size="sm" />
        </div>

        {/* Fornecedor */}
        {veiculo.fornecedor && (
          <p className="text-xs text-muted-foreground truncate">
            Fornecedor: <span className="font-medium">{veiculo.fornecedor}</span>
          </p>
        )}

        {/* Motorista vinculado */}
        {motoristaVinculado && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
            <UserCheck className="h-3 w-3" />
            <span className="truncate font-medium">{motoristaVinculado.nome}</span>
          </div>
        )}

        {/* KM */}
        {(veiculo.km_inicial != null || veiculo.km_final != null) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded">
            <Gauge className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {veiculo.km_inicial?.toLocaleString('pt-BR') || '-'} → {veiculo.km_final?.toLocaleString('pt-BR') || '-'}
              {veiculo.km_inicial != null && veiculo.km_final != null && (
                <span className="ml-1 font-semibold text-primary">
                  ({(veiculo.km_final - veiculo.km_inicial).toLocaleString('pt-BR')} km)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Estatísticas */}
        {stats && stats.totalViagens > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Bus className="w-3.5 h-3.5" />
              <span className="font-medium">{stats.totalViagens}</span>
              <span>viagens</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">{stats.totalPax}</span>
              <span>pax</span>
            </div>
            {stats.tempoMedio > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{formatarMinutos(stats.tempoMedio)}</span>
              </div>
            )}
          </div>
        )}

        {/* Badges de status operacional */}
        <div className="flex flex-wrap gap-1.5">
          {stats?.ativo && (
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0">
              Em Operação
            </Badge>
          )}
          {!motoristaVinculado && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Sem motorista
            </Badge>
          )}
        </div>

        {/* Última edição */}
        {veiculo.atualizado_por && getName && veiculo.data_atualizacao && (
          <p className="text-[10px] text-muted-foreground truncate border-t pt-2">
            Editado por {getName(veiculo.atualizado_por)}{' '}
            {formatDistanceToNow(new Date(veiculo.data_atualizacao), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
