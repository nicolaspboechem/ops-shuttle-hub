import { useState, useMemo } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { Edit2, MapPin, User, Clock, Bus, Radio } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Viagem } from '@/lib/types/viagem';
import { StatusBadge } from '@/components/viagens/StatusBadge';
import { MissaoBadge } from '@/components/viagens/MissaoBadge';
import { calcularTempoViagem, formatarMinutos, formatarHora } from '@/lib/utils/calculadores';
import { EditViagemModal } from '@/components/viagens/EditViagemModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserNames } from '@/hooks/useUserNames';

interface TransferTableProps {
  viagens: Viagem[];
  onUpdate?: () => void;
}

export function TransferTable({ viagens, onUpdate }: TransferTableProps) {
  const [editingViagem, setEditingViagem] = useState<Viagem | null>(null);
  const { visibleItems, hasMore, loadMore, total, pageSize, setPageSize } = usePaginatedList(viagens);
  
  // Get unique creator IDs to fetch names
  const creatorIds = useMemo(() => 
    viagens.map(v => v.criado_por).filter(Boolean), 
    [viagens]
  );
  const { getName } = useUserNames(creatorIds);

  const handleUpdate = async (updated: Viagem) => {
    const { error } = await supabase
      .from('viagens')
      .update({
        h_chegada: updated.h_chegada,
        h_retorno: updated.h_retorno,
        qtd_pax_retorno: updated.qtd_pax_retorno,
        encerrado: updated.encerrado,
      })
      .eq('id', updated.id);

    if (error) {
      toast.error('Erro ao atualizar viagem');
    } else {
      toast.success('Viagem atualizada!');
      setEditingViagem(null);
      onUpdate?.();
    }
  };

  if (viagens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma viagem de transfer encontrada.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-500/5">
              <TableHead className="w-20">Status</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Coordenador</TableHead>
              <TableHead className="min-w-[180px]">Ponto de Embarque</TableHead>
              <TableHead className="w-20">Saída</TableHead>
              <TableHead className="w-20">Chegada</TableHead>
              <TableHead className="w-20 text-center">Tempo</TableHead>
              <TableHead className="w-16 text-center">PAX Ida</TableHead>
              <TableHead className="w-16 text-center">PAX Volta</TableHead>
              <TableHead className="w-28">Situação</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((viagem) => {
              const tempoViagem = viagem.h_chegada 
                ? calcularTempoViagem(viagem.h_pickup, viagem.h_chegada)
                : null;

              return (
                <TableRow 
                  key={viagem.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={viagem.encerrado ? 'ok' : 'alerta'} />
                      {viagem.origem_missao_id && (
                        <MissaoBadge missaoId={viagem.origem_missao_id} />
                      )}
                      {viagem.criado_por && !viagem.origem_missao_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                              viagem.motorista.toLowerCase().includes(getName(viagem.criado_por).toLowerCase().split(' ')[0])
                                ? 'bg-blue-500/20 text-blue-600'
                                : 'bg-primary/20 text-primary'
                            }`}>
                              {viagem.motorista.toLowerCase().includes(getName(viagem.criado_por).toLowerCase().split(' ')[0])
                                ? <Bus className="h-3 w-3" />
                                : <Radio className="h-3 w-3" />
                              }
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Criado por: {getName(viagem.criado_por)}
                              {viagem.motorista.toLowerCase().includes(getName(viagem.criado_por).toLowerCase().split(' ')[0])
                                ? ' (Motorista)'
                                : ' (Operador)'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{viagem.motorista}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{viagem.tipo_veiculo || '-'}</span>
                      {viagem.placa && (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded w-fit">
                          {viagem.placa}
                        </code>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{viagem.coordenador || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-sm truncate max-w-[160px]" title={viagem.ponto_embarque || ''}>
                        {viagem.ponto_embarque || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatarHora(viagem.h_pickup)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatarHora(viagem.h_chegada)}
                  </TableCell>
                  <TableCell className="text-center">
                    {tempoViagem !== null && tempoViagem > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {formatarMinutos(tempoViagem)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{viagem.qtd_pax || 0}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">
                      {viagem.qtd_pax_retorno || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={viagem.encerrado ? 'secondary' : 'default'}
                      className={viagem.encerrado ? '' : 'bg-amber-500 hover:bg-amber-600 text-amber-950'}
                    >
                      {viagem.encerrado ? 'Encerrado' : 'Em andamento'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingViagem(viagem)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <LoadMoreFooter
        total={total}
        visible={visibleItems.length}
        hasMore={hasMore}
        onLoadMore={loadMore}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {editingViagem && (
        <EditViagemModal
          viagem={editingViagem}
          isOpen={!!editingViagem}
          onClose={() => setEditingViagem(null)}
          onSave={handleUpdate}
        />
      )}
    </>
  );
}
