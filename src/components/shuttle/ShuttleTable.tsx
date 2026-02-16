import { useMemo } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Viagem } from '@/lib/types/viagem';
import { useUserNames } from '@/hooks/useUserNames';
import { format } from 'date-fns';

interface ShuttleTableProps {
  viagens: Viagem[];
  onUpdate?: () => void;
}

export function ShuttleTable({ viagens }: ShuttleTableProps) {
  const { visibleItems, hasMore, loadMore, total, pageSize, setPageSize } = usePaginatedList(viagens);
  const creatorIds = useMemo(() => 
    viagens.map(v => v.criado_por).filter(Boolean) as string[], 
    [viagens]
  );
  const { getName } = useUserNames(creatorIds);

  if (viagens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum shuttle registrado.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-emerald-500/5">
              <TableHead>Horário</TableHead>
              <TableHead className="text-center">PAX</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead className="w-28">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((viagem) => {
              const horario = viagem.h_inicio_real
                ? format(new Date(viagem.h_inicio_real), 'HH:mm')
                : '--:--';
              const criador = viagem.criado_por ? getName(viagem.criado_por) : '-';

              return (
                <TableRow key={viagem.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-sm">{horario}</TableCell>
                  <TableCell className="text-center font-bold">{viagem.qtd_pax || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {viagem.observacao || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{criador}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Registrado</Badge>
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
    </>
  );
}
