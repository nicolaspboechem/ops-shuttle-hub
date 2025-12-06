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

export default function ViagensAtivas() {
  const { viagens, loading, lastUpdate, refetch, updateViagem } = useViagens();
  const { kpis, viagensAtivas } = useCalculos(viagens);
  
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
    return viagensAtivas.filter(v => {
      if (filtros.tipoVeiculo !== 'todos' && v.tipo_veiculo !== filtros.tipoVeiculo) {
        return false;
      }
      
      if (filtros.status !== 'todos') {
        if (filtros.status === 'em_transito' && v.h_chegada) return false;
        if (filtros.status === 'aguardando' && (!v.h_chegada || v.h_retorno)) return false;
        if (filtros.status === 'retornou' && !v.h_retorno) return false;
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
  }, [viagensAtivas, filtros]);

  const alertCount = kpis ? kpis.alertasCriticos.length + kpis.alertas.length : 0;
  const allAlertas = kpis ? [...kpis.alertasCriticos, ...kpis.alertas] : [];

  if (loading) {
    return (
      <MainLayout>
        <Header title="Viagens Ativas" />
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
        title="Viagens Ativas"
        subtitle={`${viagensAtivas.length} viagens em andamento`}
        lastUpdate={lastUpdate}
        alertCount={alertCount}
        onRefresh={refetch}
      />
      
      <div className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {viagensFiltradas.length} resultados
            </Badge>
            {filtros.busca && (
              <Badge variant="secondary" className="text-sm">
                Busca: "{filtros.busca}"
              </Badge>
            )}
          </div>
        </div>

        <FilterBar 
          filtros={filtros}
          onChange={setFiltros}
          motoristas={motoristas}
        />

        <ViagensTable 
          viagens={viagensFiltradas}
          alertas={allAlertas}
          onUpdate={updateViagem}
        />
      </div>
    </MainLayout>
  );
}
