import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { ViagensTable } from '@/components/viagens/ViagensTable';
import { FilterBar, Filtros } from '@/components/viagens/FilterBar';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { Badge } from '@/components/ui/badge';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { Skeleton } from '@/components/ui/skeleton';

export default function ViagensFinalizadas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, lastUpdate, refetch, updateViagem } = useViagens(eventoId);
  const { viagensFinalizadas } = useCalculos(viagens);
  const { getEventoById } = useEventos();
  
  const evento = eventoId ? getEventoById(eventoId) : null;
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');
  const [filtros, setFiltros] = useState<Filtros>({
    tipoVeiculo: 'todos',
    status: 'todos',
    motorista: 'todos',
    busca: ''
  });

  // Contadores por tipo de operação
  const contadores = useMemo(() => ({
    todos: viagensFinalizadas.length,
    transfer: viagensFinalizadas.filter(v => v.tipo_operacao === 'transfer').length,
    shuttle: viagensFinalizadas.filter(v => v.tipo_operacao === 'shuttle').length,
  }), [viagensFinalizadas]);

  const motoristas = useMemo(() => {
    const viagensFiltradas = tipoOperacao === 'todos' 
      ? viagens 
      : viagens.filter(v => v.tipo_operacao === tipoOperacao);
    return [...new Set(viagensFiltradas.map(v => v.motorista))].sort();
  }, [viagens, tipoOperacao]);

  const viagensFiltradas = useMemo(() => {
    return viagensFinalizadas.filter(v => {
      // Filtro por tipo de operação
      if (tipoOperacao !== 'todos' && v.tipo_operacao !== tipoOperacao) {
        return false;
      }

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
          (v.placa?.toLowerCase().includes(busca) ?? false) ||
          (v.tipo_veiculo?.toLowerCase().includes(busca) ?? false)
        );
      }
      
      return true;
    });
  }, [viagensFinalizadas, filtros, tipoOperacao]);

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
        subtitle={evento ? `${evento.nome_planilha} • ${viagensFinalizadas.length} viagens concluídas` : `${viagensFinalizadas.length} viagens concluídas hoje`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8 space-y-4">
        {/* Tabs de Operação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <OperationTabs 
            value={tipoOperacao}
            onChange={setTipoOperacao}
            contadores={contadores}
          />
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
