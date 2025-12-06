import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { ViagensTable } from '@/components/viagens/ViagensTable';
import { FilterBar } from '@/components/viagens/FilterBar';
import { Badge } from '@/components/ui/badge';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { Skeleton } from '@/components/ui/skeleton';

interface Filtros {
  tipoVeiculo: string;
  status: string;
  motorista: string;
  busca: string;
}

export default function ViagensFinalizadas() {
  const { viagens, loading, lastUpdate, refetch, updateViagem } = useViagens();
  const { viagensFinalizadas } = useCalculos(viagens);
  
  const [filtros, setFiltros] = useState<Filtros>({
    tipoVeiculo: 'todos',
    status: 'todos',
    motorista: 'todos',
    busca: ''
  });

  const motoristas = useMemo(() => {
    return [...new Set(viagens.map(v => v.motorista))].sort();
  }, [viagens]);

  const viagensFiltradas = useMemo(() => {
    return viagensFinalizadas.filter(v => {
      if (filtros.tipoVeiculo !== 'todos' && v.tipo_veiculo !== filtros.tipoVeiculo) {
        return false;
      }
      
      if (filtros.motorista !== 'todos' && v.motorista !== filtros.motorista) {
        return false;
      }
      
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        return (
          v.motorista.toLowerCase().includes(busca) ||
          v.placa.toLowerCase().includes(busca) ||
          v.veiculo.toLowerCase().includes(busca)
        );
      }
      
      return true;
    });
  }, [viagensFinalizadas, filtros]);

  if (loading) {
    return (
      <MainLayout>
        <Header title="Viagens Finalizadas" />
        <div className="p-8 space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
  );
  }

  return (
    <MainLayout>
      <Header 
        title="Viagens Finalizadas"
        subtitle={`${viagensFinalizadas.length} viagens concluídas hoje`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-sm">
            {viagensFiltradas.length} resultados
          </Badge>
        </div>

        <FilterBar 
          filtros={filtros}
          onChange={setFiltros}
          motoristas={motoristas}
        />

        <ViagensTable 
          viagens={viagensFiltradas}
          alertas={[]}
          onUpdate={updateViagem}
        />
      </div>
    </MainLayout>
  );
}
