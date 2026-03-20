import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Filtros {
  tipoVeiculo: string;
  status: string;
  motorista: string;
  busca: string;
  tipoOperacao?: string;
  coordenador?: string;
}

interface FilterBarProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  motoristas: string[];
  showTipoOperacao?: boolean;
  coordenadores?: string[];
}

export function FilterBar({ filtros, onChange, motoristas, showTipoOperacao = false }: FilterBarProps) {
  const hasActiveFilters = 
    filtros.tipoVeiculo !== 'todos' || 
    filtros.status !== 'todos' || 
    filtros.motorista !== 'todos' ||
    filtros.busca !== '' ||
    (showTipoOperacao && filtros.tipoOperacao !== 'todos');

  const clearFilters = () => {
    onChange({
      tipoVeiculo: 'todos',
      status: 'todos',
      motorista: 'todos',
      busca: '',
      tipoOperacao: 'todos'
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar motorista, placa..."
          value={filtros.busca}
          onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Tipo Veículo */}
      <Select
        value={filtros.tipoVeiculo}
        onValueChange={(value) => onChange({ ...filtros, tipoVeiculo: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Tipos</SelectItem>
          <SelectItem value="Van">Van</SelectItem>
          <SelectItem value="Ônibus">Ônibus</SelectItem>
          <SelectItem value="Sedan">Sedan</SelectItem>
          <SelectItem value="SUV">SUV</SelectItem>
          <SelectItem value="Blindado">Blindado</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filtros.status}
        onValueChange={(value) => onChange({ ...filtros, status: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Status</SelectItem>
          <SelectItem value="agendado">Agendado</SelectItem>
          <SelectItem value="em_andamento">Em Andamento</SelectItem>
          <SelectItem value="aguardando_retorno">Aguardando Retorno</SelectItem>
          <SelectItem value="encerrado">Encerrado</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      {/* Motorista */}
      <Select
        value={filtros.motorista}
        onValueChange={(value) => onChange({ ...filtros, motorista: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Motorista" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Motoristas</SelectItem>
          {motoristas.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
