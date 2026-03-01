import { useState, useMemo } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useUserNames } from '@/hooks/useUserNames';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { Bus, Users, Edit2, MapPin } from 'lucide-react';
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
import { Viagem, AlertaViagem } from '@/lib/types/viagem';
import { StatusBadge, OperationStatusBadge } from './StatusBadge';
import { MissaoBadge } from './MissaoBadge';
import { calcularTempoViagem, formatarMinutos, formatarHora } from '@/lib/utils/calculadores';
import { EditViagemModal } from './EditViagemModal';

interface ViagensTableProps {
  viagens: Viagem[];
  alertas: AlertaViagem[];
  onUpdate: (viagem: Viagem) => void;
}

function getTipoBadge(viagem: Viagem) {
  if (viagem.origem_missao_id) {
    return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] px-1.5 py-0">Missão</Badge>;
  }
  if (viagem.tipo_operacao === 'shuttle') {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] px-1.5 py-0">Shuttle</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-1.5 py-0">Transfer</Badge>;
}

export function ViagensTable({ viagens, alertas, onUpdate }: ViagensTableProps) {
  const [editingViagem, setEditingViagem] = useState<Viagem | null>(null);
  const { visibleItems, hasMore, loadMore, total, pageSize, setPageSize } = usePaginatedList(viagens);
  
  // Collect responsável IDs: preferir iniciado_por, fallback criado_por
  const responsavelIds = useMemo(() => viagens.map(v => v.iniciado_por || v.criado_por), [viagens]);
  const { getName } = useUserNames(responsavelIds);

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
              <TableHead className="w-20">Tipo</TableHead>
              <TableHead className="w-28">Situação</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead className="w-24">Placa</TableHead>
              <TableHead>Embarque</TableHead>
              <TableHead>Desembarque</TableHead>
              <TableHead className="w-20">Pickup</TableHead>
              <TableHead className="w-20">Chegada</TableHead>
              <TableHead className="w-20">Retorno</TableHead>
              <TableHead className="w-20 text-center">Tempo</TableHead>
              <TableHead className="w-16 text-center">PAX</TableHead>
              <TableHead className="w-20">Missão</TableHead>
              <TableHead>Iniciado por</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((viagem) => {
              const status = getAlertaStatus(viagem.id);
              const tempoViagem = viagem.h_retorno
                ? calcularTempoViagem(viagem.h_pickup, viagem.h_retorno)
                : viagem.h_chegada
                  ? calcularTempoViagem(viagem.h_pickup, viagem.h_chegada)
                  : null;

              const rota = [viagem.ponto_embarque, viagem.ponto_desembarque].filter(Boolean).join(' → ');

              return (
                <TableRow 
                  key={viagem.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell>{getTipoBadge(viagem)}</TableCell>
                  <TableCell>
                    <OperationStatusBadge status={viagem.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{viagem.motorista}</div>
                    {rota && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{rota}</div>
                    )}
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
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[140px]">{viagem.ponto_embarque || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[140px]">{viagem.ponto_desembarque || '-'}</span>
                    </div>
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
                    <MissaoBadge missaoId={viagem.origem_missao_id} compact />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                      {getName(viagem.iniciado_por || viagem.criado_por)}
                    </span>
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
