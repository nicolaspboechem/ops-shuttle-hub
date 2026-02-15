import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/uuid';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Users, Clock, CheckCircle, LogIn, LogOut, Car, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface EscalasAuditoriaProps {
  eventoId: string | undefined;
  evento: {
    data_inicio?: string | null;
    data_fim?: string | null;
    horario_virada_dia?: string | null;
  } | null;
  motoristas: Array<{ id: string; nome: string; veiculo_id: string | null }>;
  veiculos: Array<{ id: string; placa: string; nome?: string | null; tipo_veiculo: string }>;
}

interface Escala {
  id: string;
  nome: string;
  horario_inicio: string;
  horario_fim: string;
  cor: string | null;
}

interface EscalaMotoristLink {
  id: string;
  escala_id: string;
  motorista_id: string;
  created_at: string | null;
}

interface Presenca {
  id: string;
  motorista_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  veiculo_id: string | null;
  data: string;
}

interface VeiculoHistorico {
  id: string;
  motorista_id: string | null;
  veiculo_id: string;
  tipo_vistoria: string;
  created_at: string;
  veiculo_placa?: string;
  veiculo_nome?: string | null;
}

export function EscalasAuditoria({ eventoId, evento, motoristas, veiculos }: EscalasAuditoriaProps) {
  const viradaDia = evento?.horario_virada_dia || '04:00';
  const [dataOperacional, setDataOperacional] = useState(() => getDataOperacional(new Date(), viradaDia));
  const [verTodosDias, setVerTodosDias] = useState(false);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [escalaMotoristas, setEscalaMotoristas] = useState<EscalaMotoristLink[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [veiculoHistorico, setVeiculoHistorico] = useState<VeiculoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const validId = isValidUUID(eventoId);

  // Fetch escalas
  const fetchEscalas = useCallback(async () => {
    if (!validId) return;
    const { data } = await supabase
      .from('escalas')
      .select('id, nome, horario_inicio, horario_fim, cor')
      .eq('evento_id', eventoId!)
      .eq('ativo', true)
      .order('horario_inicio', { ascending: true });
    if (data) setEscalas(data as Escala[]);
  }, [eventoId, validId]);

  // Fetch escala_motoristas
  const fetchEscalaMotoristas = useCallback(async () => {
    if (!validId || escalas.length === 0) {
      setEscalaMotoristas([]);
      return;
    }
    const escalaIds = escalas.map(e => e.id);
    const { data } = await supabase
      .from('escala_motoristas')
      .select('id, escala_id, motorista_id, created_at')
      .in('escala_id', escalaIds);
    if (data) setEscalaMotoristas(data as EscalaMotoristLink[]);
  }, [escalas, validId]);

  // Fetch presença por dia (ou todas)
  const fetchPresencas = useCallback(async () => {
    if (!validId) return;
    let query = supabase
      .from('motorista_presenca')
      .select('id, motorista_id, checkin_at, checkout_at, veiculo_id, data')
      .eq('evento_id', eventoId!);

    if (!verTodosDias) {
      query = query.eq('data', dataOperacional);
    }

    const { data } = await query;
    if (data) setPresencas(data as Presenca[]);
  }, [eventoId, validId, dataOperacional, verTodosDias]);

  // Fetch veículo histórico do dia
  const fetchVeiculoHistorico = useCallback(async () => {
    if (!validId) return;
    let query = supabase
      .from('veiculo_vistoria_historico')
      .select('id, motorista_id, veiculo_id, tipo_vistoria, created_at')
      .eq('evento_id', eventoId!)
      .in('tipo_vistoria', ['vinculacao', 'desvinculacao'])
      .order('created_at', { ascending: true });

    if (!verTodosDias) {
      const dayStart = `${dataOperacional}T00:00:00`;
      const dayEnd = `${dataOperacional}T23:59:59`;
      query = query.gte('created_at', dayStart).lte('created_at', dayEnd);
    }

    const { data } = await query;
    if (data) {
      const enriched = (data as any[]).map(item => {
        const v = veiculos.find(v => v.id === item.veiculo_id);
        return {
          ...item,
          veiculo_placa: v?.placa,
          veiculo_nome: v?.nome,
        };
      });
      setVeiculoHistorico(enriched);
    }
  }, [eventoId, validId, dataOperacional, verTodosDias, veiculos]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEscalas();
      setLoading(false);
    };
    load();
  }, [fetchEscalas]);

  useEffect(() => { fetchEscalaMotoristas(); }, [fetchEscalaMotoristas]);
  useEffect(() => { fetchPresencas(); }, [fetchPresencas]);
  useEffect(() => { fetchVeiculoHistorico(); }, [fetchVeiculoHistorico]);

  // Helpers
  const getMotoristaName = (id: string) => motoristas.find(m => m.id === id)?.nome || 'Desconhecido';
  const getVeiculoLabel = (id: string | null) => {
    if (!id) return null;
    const v = veiculos.find(v => v.id === id);
    return v ? `${v.tipo_veiculo} ${v.placa}${v.nome ? ` "${v.nome}"` : ''}` : null;
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  // KPIs
  const kpis = useMemo(() => {
    const motoristasEscalados = new Set(escalaMotoristas.map(em => em.motorista_id));
    const total = motoristasEscalados.size;
    
    const comCheckin = presencas.filter(p => 
      p.checkin_at && motoristasEscalados.has(p.motorista_id)
    );
    const comCheckout = presencas.filter(p => 
      p.checkin_at && p.checkout_at && motoristasEscalados.has(p.motorista_id)
    );
    
    let horasTotais = 0;
    comCheckout.forEach(p => {
      if (p.checkin_at && p.checkout_at) {
        horasTotais += differenceInMinutes(new Date(p.checkout_at), new Date(p.checkin_at));
      }
    });

    return {
      total,
      comCheckin: new Set(comCheckin.map(p => p.motorista_id)).size,
      comCheckout: new Set(comCheckout.map(p => p.motorista_id)).size,
      horasTotais,
    };
  }, [escalaMotoristas, presencas]);

  // Get presença data for a motorista
  const getPresencaMotorista = (motoristaId: string) => {
    return presencas.filter(p => p.motorista_id === motoristaId);
  };

  // Get veículo histórico for a motorista on selected day
  const getVeiculoHistoricoMotorista = (motoristaId: string) => {
    return veiculoHistorico.filter(vh => vh.motorista_id === motoristaId);
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows: any[] = [];
    
    escalas.forEach(escala => {
      const motoristasIds = escalaMotoristas
        .filter(em => em.escala_id === escala.id)
        .map(em => em.motorista_id);

      motoristasIds.forEach(mid => {
        const nome = getMotoristaName(mid);
        const presencaList = getPresencaMotorista(mid);
        
        if (presencaList.length === 0) {
          rows.push({
            Escala: escala.nome,
            Horário: `${escala.horario_inicio} - ${escala.horario_fim}`,
            Motorista: nome,
            Data: verTodosDias ? '-' : dataOperacional,
            Veículo: '-',
            'Check-in': '-',
            'Check-out': '-',
            Duração: '-',
          });
        } else {
          presencaList.forEach(p => {
            const vLabel = getVeiculoLabel(p.veiculo_id) || '-';
            const checkinStr = p.checkin_at ? format(new Date(p.checkin_at), 'dd/MM HH:mm') : '-';
            const checkoutStr = p.checkout_at ? format(new Date(p.checkout_at), 'dd/MM HH:mm') : '-';
            const duracao = p.checkin_at && p.checkout_at
              ? formatDuration(differenceInMinutes(new Date(p.checkout_at), new Date(p.checkin_at)))
              : '-';
            
            rows.push({
              Escala: escala.nome,
              Horário: `${escala.horario_inicio} - ${escala.horario_fim}`,
              Motorista: nome,
              Data: p.data,
              Veículo: vLabel,
              'Check-in': checkinStr,
              'Check-out': checkoutStr,
              Duração: duracao,
            });
          });
        }
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria Escalas');
    XLSX.writeFile(wb, `auditoria-escalas-${verTodosDias ? 'todos' : dataOperacional}.xlsx`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Escalas</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de presença por escala e dia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DiaSeletor
            dataOperacional={dataOperacional}
            onChange={setDataOperacional}
            dataInicio={evento?.data_inicio}
            dataFim={evento?.data_fim}
            showToggleAll
            verTodosDias={verTodosDias}
            onToggleTodosDias={setVerTodosDias}
          />
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{kpis.total}</p>
              <p className="text-xs text-muted-foreground">Escalados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <LogIn className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{kpis.comCheckin}</p>
              <p className="text-xs text-muted-foreground">Check-in</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <LogOut className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{kpis.comCheckout}</p>
              <p className="text-xs text-muted-foreground">Check-out</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{formatDuration(kpis.horasTotais)}</p>
              <p className="text-xs text-muted-foreground">Horas trabalhadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalas */}
      {escalas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma escala ativa encontrada para este evento.
          </CardContent>
        </Card>
      ) : (
        escalas.map(escala => {
          const motoristasIds = escalaMotoristas
            .filter(em => em.escala_id === escala.id)
            .map(em => em.motorista_id);

          return (
            <Card key={escala.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {escala.cor && (
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: escala.cor }} 
                    />
                  )}
                  <CardTitle className="text-lg">
                    {escala.nome}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {escala.horario_inicio?.slice(0, 5)} - {escala.horario_fim?.slice(0, 5)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {motoristasIds.length} motorista{motoristasIds.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {motoristasIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum motorista nesta escala.</p>
                ) : (
                  <div className="divide-y">
                    {motoristasIds.map(mid => {
                      const nome = getMotoristaName(mid);
                      const presencaList = getPresencaMotorista(mid);
                      const vHistorico = getVeiculoHistoricoMotorista(mid);
                      const motorista = motoristas.find(m => m.id === mid);
                      const veiculoAtual = getVeiculoLabel(motorista?.veiculo_id || null);

                      return (
                        <div key={mid} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{nome}</p>
                              
                              {/* Presença */}
                              {presencaList.length === 0 ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sem presença registrada
                                </p>
                              ) : (
                                presencaList.map(p => (
                                  <div key={p.id} className="mt-1 space-y-0.5">
                                    <div className="flex items-center gap-2 text-xs">
                                      {p.checkin_at && (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <CheckCircle className="w-3 h-3" />
                                          Check-in {format(new Date(p.checkin_at), 'HH:mm')}
                                        </span>
                                      )}
                                      {p.checkout_at ? (
                                        <span className="flex items-center gap-1 text-blue-600">
                                          <LogOut className="w-3 h-3" />
                                          Check-out {format(new Date(p.checkout_at), 'HH:mm')}
                                          {p.checkin_at && (
                                            <span className="text-muted-foreground ml-1">
                                              ({formatDuration(differenceInMinutes(new Date(p.checkout_at), new Date(p.checkin_at)))})
                                            </span>
                                          )}
                                        </span>
                                      ) : p.checkin_at ? (
                                        <span className="text-xs text-muted-foreground">Sem check-out</span>
                                      ) : null}
                                    </div>
                                    {/* Veículo do check-in */}
                                    {p.veiculo_id && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Car className="w-3 h-3" />
                                        {getVeiculoLabel(p.veiculo_id)}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}

                              {/* Veículo atual (se sem presença mas tem vínculo) */}
                              {presencaList.length === 0 && veiculoAtual && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Car className="w-3 h-3" />
                                  {veiculoAtual}
                                </div>
                              )}

                              {/* Histórico de veículos vinculados no dia */}
                              {vHistorico.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {vHistorico.map(vh => (
                                    <div key={vh.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Car className="w-3 h-3" />
                                      <span className={vh.tipo_vistoria === 'vinculacao' ? 'text-green-600' : 'text-red-500'}>
                                        {vh.tipo_vistoria === 'vinculacao' ? 'Vinculou' : 'Desvinculou'}
                                      </span>
                                      {vh.veiculo_placa}{vh.veiculo_nome ? ` "${vh.veiculo_nome}"` : ''}
                                      <span className="ml-1">
                                        às {format(new Date(vh.created_at), 'HH:mm')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
