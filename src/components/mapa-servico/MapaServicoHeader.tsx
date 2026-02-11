import { useState, useEffect, useDeferredValue } from 'react';
import { Map as MapIcon, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface FilterState {
  search: string;
  deferredSearch: string;
  statusFilters: Set<string>;
  backupOnly: boolean;
  semVeiculo: boolean;
}

interface StatusCount {
  disponiveis: number;
  emTransito: number;
  retornando: number;
  total: number;
}

interface MapaServicoHeaderProps {
  statusCount: StatusCount;
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onToggleStatus: (status: string) => void;
  onToggleBackup: () => void;
  onToggleSemVeiculo: () => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (val: boolean) => void;
  refreshProgress: number;
}

const statusChips = [
  { key: 'disponivel', label: 'Disponível', activeClass: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { key: 'em_viagem', label: 'Em Viagem', activeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { key: 'indisponivel', label: 'Indisponível', activeClass: 'bg-red-500/20 text-red-400 border-red-500/40' },
];

export function MapaServicoHeader({
  statusCount,
  filters,
  onSearchChange,
  onToggleStatus,
  onToggleBackup,
  onToggleSemVeiculo,
  onRefresh,
  autoRefresh,
  onAutoRefreshChange,
  refreshProgress,
}: MapaServicoHeaderProps) {
  return (
    <div className="flex flex-col gap-2 px-6 py-3 border-b border-border shrink-0">
      {/* Row 1: Title + Counters + Refresh */}
      <div className="flex items-center gap-3 flex-wrap">
        <MapIcon className="w-5 h-5 text-primary shrink-0" />
        <h1 className="text-lg font-semibold text-foreground">Mapa de Serviço</h1>

        {/* Status counters */}
        <div className="flex items-center gap-1.5 ml-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-green-500/40 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {statusCount.disponiveis}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-blue-500/40 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {statusCount.emTransito}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-amber-500/40 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {statusCount.retornando}
          </Badge>
          <span className="text-xs text-muted-foreground ml-1">
            {statusCount.total} total
          </span>
        </div>

        {/* Auto-refresh + Refresh button */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={autoRefresh}
              onCheckedChange={onAutoRefreshChange}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">Auto</span>
          </div>
          <div className="relative">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onRefresh}>
              <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-none")} />
              Atualizar
            </Button>
            {autoRefresh && (
              <Progress
                value={refreshProgress}
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-none bg-transparent"
              />
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Search + Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar motorista..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        {statusChips.map(chip => {
          const active = filters.statusFilters.has(chip.key);
          return (
            <button
              key={chip.key}
              onClick={() => onToggleStatus(chip.key)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                active
                  ? chip.activeClass
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {chip.label}
            </button>
          );
        })}

        <button
          onClick={onToggleBackup}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
            filters.backupOnly
              ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          Backup
        </button>

        <button
          onClick={onToggleSemVeiculo}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
            filters.semVeiculo
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          Sem Veículo
        </button>
      </div>
    </div>
  );
}
