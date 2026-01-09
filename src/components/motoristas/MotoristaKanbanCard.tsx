import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bus, Car, MoreVertical, Pencil, Trash2, Users, Clock, Phone, GripVertical, Eye, Link2, Plus, AlertTriangle, Truck, MessageCircle, CheckCircle, XCircle, UserX } from "lucide-react";
import { formatarMinutos } from "@/lib/utils/calculadores";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Motorista, Veiculo } from "@/hooks/useCadastros";

// Status configuration with colors and icons
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  disponivel: { label: 'Disponível', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle },
  em_viagem: { label: 'Em Viagem', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Car },
  indisponivel: { label: 'Indisponível', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: XCircle },
  inativo: { label: 'Inativo', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: UserX },
};

interface MotoristaMetricas {
  motorista: string;
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
}

interface MotoristaKanbanCardProps {
  motorista: Motorista;
  metricas?: MotoristaMetricas | null;
  veiculo?: Veiculo | null;
  onDelete: () => void;
  onVincularVeiculo: () => void;
  isDragOverlay?: boolean;
}

export function MotoristaKanbanCard({ 
  motorista, 
  metricas,
  veiculo,
  onDelete,
  onVincularVeiculo,
  isDragOverlay = false
}: MotoristaKanbanCardProps) {
  const TipoIcon = veiculo?.tipo_veiculo?.toLowerCase().includes('van') ? Car : Bus;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: motorista.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  // Drag overlay version
  if (isDragOverlay) {
    return (
      <motion.div
        initial={{ scale: 1, rotate: 0 }}
        animate={{ scale: 1.05, rotate: 2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="overflow-hidden border-2 border-primary bg-card w-[280px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                {motorista.nome.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{motorista.nome}</p>
                {motorista.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {motorista.telefone}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      layoutId={motorista.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        scale: 1,
        transition: { type: "spring", stiffness: 500, damping: 30 }
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      ref={setNodeRef}
      style={style}
    >
      <Card 
        className={cn(
          "overflow-hidden hover:shadow-md transition-shadow duration-200",
          isDragging && "shadow-lg ring-2 ring-primary/50"
        )}
      >
        <CardContent className="p-3 space-y-2">
          {/* Header: Avatar + Nome + Menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Drag Handle */}
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted touch-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                {motorista.nome.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{motorista.nome}</p>
                  {/* Status Badge */}
                  {motorista.status && STATUS_CONFIG[motorista.status] && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 shrink-0",
                        STATUS_CONFIG[motorista.status].bgColor,
                        STATUS_CONFIG[motorista.status].color,
                        "border-0"
                      )}
                    >
                      {STATUS_CONFIG[motorista.status].label}
                    </Badge>
                  )}
                </div>
                {motorista.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {motorista.telefone}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={onVincularVeiculo}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Vincular Veículo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar Motorista
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Motorista
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Confirmar Exclusão
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir <strong>{motorista.nome}</strong>? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onDelete}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Veículo vinculado */}
          {veiculo ? (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
              <TipoIcon className="w-4 h-4 text-muted-foreground" />
              <code className="font-medium">{veiculo.placa}</code>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{veiculo.tipo_veiculo}</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-muted-foreground text-xs">
              <Truck className="w-4 h-4" />
              Sem veículo vinculado
            </div>
          )}

          {/* Estatísticas */}
          {metricas && metricas.totalViagens > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
              <div className="flex items-center gap-1">
                <Bus className="w-3.5 h-3.5" />
                <span className="font-medium">{metricas.totalViagens}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span className="font-medium">{metricas.totalPax}</span>
              </div>
              {metricas.tempoMedio > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium">{formatarMinutos(metricas.tempoMedio)}</span>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp button */}
          {motorista.telefone && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-500/20"
              onClick={() => {
                const phone = motorista.telefone?.replace(/\D/g, '');
                window.open(`https://wa.me/55${phone}`, '_blank');
              }}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              WhatsApp
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
