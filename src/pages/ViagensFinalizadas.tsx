import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EventLayout } from '@/components/layout/EventLayout';
import { ViagensTable } from '@/components/viagens/ViagensTable';
import { FilterBar, Filtros } from '@/components/viagens/FilterBar';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { Badge } from '@/components/ui/badge';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useEventos } from '@/hooks/useEventos';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Skeleton } from '@/components/ui/skeleton';

export default function ViagensFinalizadas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById } = useEventos();
  const { getAgoraSync } = useServerTime();
  const evento = eventoId ? getEventoById(eventoId) : null;
  
  // Dia operacional
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(new Date(), '04:00')
  );
  const [verTodosDias, setVerTodosDias] = useState(false);

  // Atualizar data operacional quando evento carregar
  useEffect(() => {
    if (evento?.horario_virada_dia) {
      setDataOperacional(getDataOperacional(getAgoraSync(), evento.horario_virada_dia));
    }
  }, [evento?.horario_virada_dia, getAgoraSync]);

  // Preparar options para useViagens
  const viagensOptions = useMemo(() => {
    if (verTodosDias) return undefined;
    return {
      dataOperacional,
      horarioVirada: evento?.horario_virada_dia || '04:00',
    };
  }, [dataOperacional, evento?.horario_virada_dia, verTodosDias]);

  const { viagens, loading, updateViagem } = useViagens(eventoId, viagensOptions);
  const { viagensFinalizadas } = useCalculos(viagens);
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('todos');
  const [filtros, setFiltros] = useState<Filtros>({ tipoVeiculo: 'todos', status: 'todos', motorista: 'todos', busca: '' });

  const contadores = useMemo(() => ({
    todos: viagensFinalizadas.length,
    transfer: viagensFinalizadas.filter(v => v.tipo_operacao === 'transfer' && !v.origem_missao_id).length,
    shuttle: viagensFinalizadas.filter(v => v.tipo_operacao === 'shuttle' && !v.origem_missao_id).length,
    missao: viagensFinalizadas.filter(v => v.origem_missao_id).length,
  }), [viagensFinalizadas]);

  const motoristas = useMemo(() => {
    const vf = tipoOperacao === 'todos' ? viagens : viagens.filter(v => v.tipo_operacao === tipoOperacao);
    return [...new Set(vf.map(v => v.motorista))].sort();
  }, [viagens, tipoOperacao]);

  const viagensFiltradas = useMemo(() => {
    return viagensFinalizadas.filter(v => {
      // Filtro por tipo de operação ou missão
      if (tipoOperacao === 'missao') {
        if (!v.origem_missao_id) return false;
      } else if (tipoOperacao !== 'todos') {
        if (v.tipo_operacao !== tipoOperacao || v.origem_missao_id) return false;
      }
      if (filtros.tipoVeiculo !== 'todos' && v.tipo_veiculo !== filtros.tipoVeiculo) return false;
      if (filtros.motorista !== 'todos' && v.motorista !== filtros.motorista) return false;
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        return v.motorista.toLowerCase().includes(busca) || (v.placa?.toLowerCase().includes(busca) ?? false);
      }
      return true;
    });
  }, [viagensFinalizadas, filtros, tipoOperacao]);

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
        <h1 className="text-2xl font-bold">Viagens Finalizadas</h1>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <DiaSeletor
              dataOperacional={dataOperacional}
              onChange={setDataOperacional}
              dataInicio={evento?.data_inicio}
              dataFim={evento?.data_fim}
              showToggleAll={true}
              verTodosDias={verTodosDias}
              onToggleTodosDias={setVerTodosDias}
            />
            <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />
          </div>
          <Badge variant="outline">{viagensFiltradas.length} resultados</Badge>
        </div>
        <FilterBar filtros={filtros} onChange={setFiltros} motoristas={motoristas} />
        <ViagensTable viagens={viagensFiltradas} alertas={[]} onUpdate={updateViagem} />
      </div>
    </EventLayout>
  );
}
