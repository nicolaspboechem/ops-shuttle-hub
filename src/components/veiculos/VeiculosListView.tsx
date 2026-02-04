import { useState } from 'react';
import { Bus, Car, MoreVertical, Pencil, Trash2, UserCheck, Gauge, Fuel, Eye, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { VeiculoStatusBadge, FuelIndicator, AvariaIndicator } from './VeiculoStatusBadge';
import { VeiculoModal } from '@/components/cadastros/CadastroModals';
import { Veiculo, Motorista } from '@/hooks/useCadastros';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface VeiculosListViewProps {
  veiculos: Veiculo[];
  motoristas: Motorista[];
  eventoId?: string;
  onSave: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any, oldPlaca: string) => Promise<void>;
  onDelete: (id: string) => void;
  onViewDetails?: (veiculoId: string) => void;
}

export function VeiculosListView({
  veiculos,
  motoristas,
  eventoId,
  onSave,
  onUpdate,
  onDelete,
  onViewDetails
}: VeiculosListViewProps) {

  const getMotoristaVinculado = (veiculoId: string) => {
    return motoristas.find(m => m.veiculo_id === veiculoId);
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo?.toLowerCase().includes('van') || tipo === 'Sedan' || tipo === 'SUV') {
      return Car;
    }
    return Bus;
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Veículo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última Inspeção</TableHead>
            <TableHead>Motorista</TableHead>
            <TableHead className="text-center">Combustível</TableHead>
            <TableHead className="text-center">KM</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {veiculos.map((veiculo) => {
            const TipoIcon = getTipoIcon(veiculo.tipo_veiculo);
            const motoristaVinculado = getMotoristaVinculado(veiculo.id);
            
            return (
              <TableRow key={veiculo.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      veiculo.tipo_veiculo === 'Ônibus' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    )}>
                      <TipoIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-bold text-sm tracking-wider bg-muted px-1.5 py-0.5 rounded">
                          {veiculo.placa}
                        </code>
                        <Badge variant="outline" className="text-[10px]">
                          {veiculo.tipo_veiculo}
                        </Badge>
                      </div>
                      {veiculo.nome && (
                        <p className="text-xs text-muted-foreground mt-0.5">{veiculo.nome}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <VeiculoStatusBadge status={veiculo.status} size="sm" />
                    <AvariaIndicator hasAvarias={veiculo.possui_avarias} size="sm" />
                  </div>
                </TableCell>
                <TableCell>
                  {veiculo.inspecao_data ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <ClipboardCheck className="h-3 w-3 text-blue-500" />
                        <span>{format(parseISO(veiculo.inspecao_data), "dd/MM HH:mm")}</span>
                      </div>
                      {veiculo.inspecao_perfil?.full_name && (
                        <span className="text-xs text-muted-foreground">
                          por {veiculo.inspecao_perfil.full_name}
                        </span>
                      )}
                      {veiculo.possui_avarias && veiculo.inspecao_dados?.areas && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {veiculo.inspecao_dados.areas.filter((a: any) => a.possuiAvaria).length} avaria(s)
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem inspeção</span>
                  )}
                </TableCell>
                <TableCell>
                  {motoristaVinculado ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="h-3 w-3" />
                      <span className="truncate font-medium">{motoristaVinculado.nome}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem motorista</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <FuelIndicator level={veiculo.nivel_combustivel} size="sm" />
                </TableCell>
                <TableCell className="text-center">
                  {(veiculo.km_inicial != null || veiculo.km_final != null) ? (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Gauge className="w-3 h-3" />
                      <span>
                        {veiculo.km_inicial?.toLocaleString('pt-BR') || '-'} → {veiculo.km_final?.toLocaleString('pt-BR') || '-'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {onViewDetails && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onViewDetails(veiculo.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <VeiculoModal
                          veiculo={veiculo}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {veiculos.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          Nenhum veículo encontrado
        </div>
      )}
    </div>
  );
}
