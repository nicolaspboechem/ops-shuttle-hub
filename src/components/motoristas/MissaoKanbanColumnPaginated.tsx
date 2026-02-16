import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { MissaoKanbanColumn } from '@/components/motoristas/MissaoKanbanColumn';
import { MissaoKanbanCard } from '@/components/motoristas/MissaoKanbanCard';
import { Missao } from '@/hooks/useMissoes';

interface MissaoKanbanColumnPaginatedProps {
  id: string;
  title: string;
  accentColor: string;
  missoes: Missao[];
  motoristas: { id: string; nome: string }[];
  onEdit: (missao: Missao) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function MissaoKanbanColumnPaginated({
  id, title, accentColor, missoes, motoristas, onEdit, onDelete, onStatusChange,
}: MissaoKanbanColumnPaginatedProps) {
  const { visibleItems, hasMore, loadMore, total, pageSize, setPageSize } = usePaginatedList(missoes);

  return (
    <MissaoKanbanColumn
      id={id}
      title={title}
      count={missoes.length}
      accentColor={accentColor}
    >
      {visibleItems.map(missao => {
        const motorista = motoristas.find(m => m.id === missao.motorista_id);
        return (
          <MissaoKanbanCard
            key={missao.id}
            missao={missao}
            motoristaNome={motorista?.nome}
            onEdit={() => onEdit(missao)}
            onDelete={() => onDelete(missao.id)}
            onStatusChange={(status) => onStatusChange(missao.id, status)}
          />
        );
      })}
      <LoadMoreFooter
        total={total}
        visible={visibleItems.length}
        hasMore={hasMore}
        onLoadMore={loadMore}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </MissaoKanbanColumn>
  );
}
