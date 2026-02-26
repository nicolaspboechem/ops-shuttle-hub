import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FileBarChart, Download } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OperationTabs, TipoOperacaoFiltro } from '@/components/layout/OperationTabs';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { useMotoristas } from '@/hooks/useCadastros';
import { useAlertasFrotaConsolidado } from '@/hooks/useAlertasFrotaConsolidado';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditoriaResumoTab } from '@/components/auditoria/AuditoriaResumoTab';
import { AuditoriaMotoristasTab } from '@/components/auditoria/AuditoriaMotoristasTab';
import { AuditoriaVeiculosTab } from '@/components/auditoria/AuditoriaVeiculosTab';
import { AuditoriaAbastecimentoTab } from '@/components/auditoria/AuditoriaAbastecimentoTab';

export default function Auditoria() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { viagens, loading: loadingViagens } = useViagens(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  const { metricasPorHora } = useCalculos(viagens);
  const { total: alertasTotais, resolvidos: alertasResolvidos } = useAlertasFrotaConsolidado(eventoId);
  
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiltro>('missao');

  const viagensFiltradas = useMemo(() => {
    if (tipoOperacao === 'missao') return viagens.filter(v => !!v.origem_missao_id);
    return viagens.filter(v => v.tipo_operacao === tipoOperacao && !v.origem_missao_id);
  }, [viagens, tipoOperacao]);

  const contadores = useMemo(() => ({
    transfer: viagens.filter(v => v.tipo_operacao === 'transfer' && !v.origem_missao_id).length,
    shuttle: viagens.filter(v => v.tipo_operacao === 'shuttle' && !v.origem_missao_id).length,
    missao: viagens.filter(v => v.origem_missao_id).length,
  }), [viagens]);

  if (loadingViagens) {
    return (
      <EventLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileBarChart className="w-7 h-7" />
              Auditoria
            </h1>
            <p className="text-sm text-muted-foreground">
              Relatório consolidado da operação
            </p>
          </div>
        </div>

        <OperationTabs value={tipoOperacao} onChange={setTipoOperacao} contadores={contadores} />

        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resumo">Resumo Geral</TabsTrigger>
            <TabsTrigger value="motoristas">Motoristas</TabsTrigger>
            <TabsTrigger value="veiculos">Veículos</TabsTrigger>
            <TabsTrigger value="abastecimento">Abastecimento</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <AuditoriaResumoTab
              viagensFiltradas={viagensFiltradas}
              metricasPorHora={metricasPorHora}
              alertasTotais={alertasTotais}
              alertasResolvidos={alertasResolvidos}
            />
          </TabsContent>

          <TabsContent value="motoristas">
            <AuditoriaMotoristasTab viagensFiltradas={viagensFiltradas} />
          </TabsContent>

          <TabsContent value="veiculos">
            <AuditoriaVeiculosTab viagensFiltradas={viagensFiltradas} motoristas={motoristas} />
          </TabsContent>

          <TabsContent value="abastecimento">
            <AuditoriaAbastecimentoTab alertasTotais={alertasTotais} alertasResolvidos={alertasResolvidos} />
          </TabsContent>
        </Tabs>
      </div>
    </EventLayout>
  );
}
