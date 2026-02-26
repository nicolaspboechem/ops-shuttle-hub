import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface LoadMoreFooterProps {
  total: number;
  visible: number;
  hasMore: boolean;
  onLoadMore: () => void;
  pageSize: number;
  onPageSizeChange?: (n: number) => void;
  showPageSizeSelector?: boolean;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function LoadMoreFooter({
  total,
  visible,
  hasMore,
  onLoadMore,
  pageSize,
  onPageSizeChange,
  showPageSizeSelector = true,
}: LoadMoreFooterProps) {
  if (total <= 0) return null;

  return (
    <div className="flex items-center justify-between pt-3 pb-1 px-1 text-sm text-muted-foreground">
      <span>
        Exibindo {Math.min(visible, total)} de {total}
      </span>

      <div className="flex items-center gap-2">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1 text-xs">
            {PAGE_SIZE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => onPageSizeChange(opt)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  pageSize === opt
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            className="gap-1 h-7 text-xs"
          >
            Ver mais
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
