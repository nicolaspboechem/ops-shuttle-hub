import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EventLayout } from '@/components/layout/EventLayout';
import { ViagensTable } from '@/components/viagens/ViagensTable';
import { FilterBar, Filtros } from '@/components/viagens/FilterBar';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { Badge } from '@/components/ui/badge';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { Skeleton } from '@/components/ui/skeleton';

export default function ViagensAtivas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading, updateViagem } = useViagens(eventoId);
  const { kpis, viagensAtivas } = useCalculos(viagens);
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');
  const [filtros, setFiltros] = useState<Filtros>({ tipoVeiculo: 'todos', status: 'todos', motorista: 'todos', busca: '' });

  const contadores = useMemo(() => ({
    todos: viagensAtivas.length,
    transfer: viagensAtivas.filter(v => v.tipo_operacao === 'transfer').length,
    shuttle: viagensAtivas.filter(v => v.tipo_operacao === 'shuttle').length,
  }), [viagensAtivas]);

  const motoristas = useMemo(() => {
    const vf = tipoOperacao === 'todos' ? viagens : viagens.filter(v => v.tipo_operacao === tipoOperacao);
    return [...new Set(vf.map(v => v.motorista))].sort();
  }, [viagens, tipoOperacao]);

  const viagensFiltradas = useMemo(() => {
    return viagensAtivas.filter(v => {
      if (tipoOperacao !== 'todos' && v.tipo_operacao !== tipoOperacao) return false;
      if (filtros.tipoVeiculo !== 'todos' && v.tipo_veiculo !== filtros.tipoVeiculo) return false;
      if (filtros.status !== 'todos') {
        if (filtros.status === 'em_transito' && v.h_chegada) return false;
        if (filtros.status === 'aguardando' && (!v.h_chegada || v.h_retorno)) return false;
        if (filtros.status === 'retornou' && !v.h_retorno) return false;
      }
      if (filtros.motorista !== 'todos' && v.motorista !== filtros.motorista) return false;
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        return v.motorista.toLowerCase().includes(busca) || (v.placa?.toLowerCase().includes(busca) ?? false);
      }
      return true;
    });
  }, [viagensAtivas, filtros, tipoOperacao]);

  const allAlertas = kpis ? [...kpis.alertasCriticos, ...kpis.alertas] : [];

  if (loading) {
    return (
      <EventLayout>
        <div className="p-8 space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-96" />
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold">Viagens Ativas</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />
          <Badge variant="outline">{viagensFiltradas.length} resultados</Badge>
        </div>
        <FilterBar filtros={filtros} onChange={setFiltros} motoristas={motoristas} />
        <ViagensTable viagens={viagensFiltradas} alertas={allAlertas} onUpdate={updateViagem} />
      </div>
    </EventLayout>
  );
}
