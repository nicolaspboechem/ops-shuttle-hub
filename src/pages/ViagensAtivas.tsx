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

export default function ViagensAtivas() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById } = useEventos();
  const { getAgoraSync } = useServerTime();
  const evento = eventoId ? getEventoById(eventoId) : null;
  
  // Dia operacional
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(getAgoraSync(), '04:00')
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
  const { kpis, viagensAtivas } = useCalculos(viagens);
  
  const tiposHabilitados = (evento as any)?.tipos_viagem_habilitados as string[] | null;
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>(() => {
    const tipos = tiposHabilitados;
    if (tipos?.length) return tipos[0] as TipoOperacaoFiltro;
    return 'missao';
  });
  const [filtros, setFiltros] = useState<Filtros>({ tipoVeiculo: 'todos', status: 'todos', motorista: 'todos', busca: '' });

  const contadores = useMemo(() => ({
    transfer: viagensAtivas.filter(v => v.tipo_operacao === 'transfer' && !v.origem_missao_id).length,
    shuttle: viagensAtivas.filter(v => v.tipo_operacao === 'shuttle' && !v.origem_missao_id).length,
    missao: viagensAtivas.filter(v => v.origem_missao_id).length,
  }), [viagensAtivas]);

  const motoristas = useMemo(() => {
    const vf = viagens.filter(v => {
      if (tipoOperacao === 'missao') return !!v.origem_missao_id;
      return v.tipo_operacao === tipoOperacao && !v.origem_missao_id;
    });
    return [...new Set(vf.map(v => v.motorista))].sort();
  }, [viagens, tipoOperacao]);

  const viagensFiltradas = useMemo(() => {
    return viagensAtivas.filter(v => {
      // Filtro por tipo de operação ou missão
      if (tipoOperacao === 'missao') {
        if (!v.origem_missao_id) return false;
      } else {
        if (v.tipo_operacao !== tipoOperacao || v.origem_missao_id) return false;
      }
      if (filtros.tipoVeiculo !== 'todos' && v.tipo_veiculo !== filtros.tipoVeiculo) return false;
      if (filtros.status !== 'todos' && v.status !== filtros.status) return false;
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
            <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} tiposHabilitados={tiposHabilitados} />
          </div>
          <Badge variant="outline">{viagensFiltradas.length} resultados</Badge>
        </div>
        <FilterBar filtros={filtros} onChange={setFiltros} motoristas={motoristas} />
        <ViagensTable viagens={viagensFiltradas} alertas={allAlertas} onUpdate={updateViagem} />
      </div>
    </EventLayout>
  );
}
