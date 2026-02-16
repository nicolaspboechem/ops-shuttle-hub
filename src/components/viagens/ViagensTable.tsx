import { useState } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { Bus, Users, Edit2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Viagem, AlertaViagem } from '@/lib/types/viagem';
import { StatusBadge, TripStatusBadge } from './StatusBadge';
import { calcularTempoViagem, formatarMinutos, formatarHora } from '@/lib/utils/calculadores';
import { EditViagemModal } from './EditViagemModal';

interface ViagensTableProps {
  viagens: Viagem[];
  alertas: AlertaViagem[];
  onUpdate: (viagem: Viagem) => void;
}

export function ViagensTable({ viagens, alertas, onUpdate }: ViagensTableProps) {
  const [editingViagem, setEditingViagem] = useState<Viagem | null>(null);
  const { visibleItems, hasMore, loadMore, total, pageSize, setPageSize } = usePaginatedList(viagens);
  const getAlertaStatus = (viagemId: string) => {
    const alerta = alertas.find(a => a.viagemId === viagemId);
    return alerta?.status || 'ok';
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead className="w-24">Placa</TableHead>
              <TableHead className="w-20">Pickup</TableHead>
              <TableHead className="w-20">Chegada</TableHead>
              <TableHead className="w-20">Retorno</TableHead>
              <TableHead className="w-20 text-center">Tempo</TableHead>
              <TableHead className="w-16 text-center">PAX</TableHead>
              <TableHead className="w-24">Situação</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((viagem) => {
              const status = getAlertaStatus(viagem.id);
              const tempoViagem = viagem.h_chegada 
                ? calcularTempoViagem(viagem.h_pickup, viagem.h_chegada)
                : null;

              return (
                <TableRow 
                  key={viagem.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{viagem.motorista}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{viagem.tipo_veiculo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {viagem.placa || '-'}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatarHora(viagem.h_pickup)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatarHora(viagem.h_chegada)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatarHora(viagem.h_retorno)}
                  </TableCell>
                  <TableCell className="text-center">
                    {tempoViagem !== null && tempoViagem > 0 ? (
                      <span className="text-sm font-medium">
                        {formatarMinutos(tempoViagem)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{viagem.qtd_pax || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TripStatusBadge 
                      hChegada={viagem.h_chegada}
                      hRetorno={viagem.h_retorno}
                      encerrado={viagem.encerrado}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingViagem(viagem)}
                      className="h-8 w-8"
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
          onSave={(updated) => {
            onUpdate(updated);
            setEditingViagem(null);
          }}
        />
      )}
    </>
  );
}
