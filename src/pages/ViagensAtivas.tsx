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

export default function ViagensAtivas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, lastUpdate, refetch, updateViagem } = useViagens(eventoId);
  const { kpis, viagensAtivas } = useCalculos(viagens);
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
    todos: viagensAtivas.length,
    transfer: viagensAtivas.filter(v => v.tipo_operacao === 'transfer').length,
    shuttle: viagensAtivas.filter(v => v.tipo_operacao === 'shuttle').length,
  }), [viagensAtivas]);

  const motoristas = useMemo(() => {
    const viagensFiltradas = tipoOperacao === 'todos' 
      ? viagens 
      : viagens.filter(v => v.tipo_operacao === tipoOperacao);
    return [...new Set(viagensFiltradas.map(v => v.motorista))].sort();
  }, [viagens, tipoOperacao]);

  const viagensFiltradas = useMemo(() => {
    return viagensAtivas.filter(v => {
      // Filtro por tipo de operação
      if (tipoOperacao !== 'todos' && v.tipo_operacao !== tipoOperacao) {
        return false;
      }

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
          (v.placa?.toLowerCase().includes(busca) ?? false) ||
          (v.tipo_veiculo?.toLowerCase().includes(busca) ?? false)
        );
      }
      
      return true;
    });
  }, [viagensAtivas, filtros, tipoOperacao]);

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
        subtitle={evento ? `${evento.nome_planilha} • ${viagensAtivas.length} viagens em andamento` : `${viagensAtivas.length} viagens em andamento`}
        lastUpdate={lastUpdate}
        alertCount={alertCount}
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
