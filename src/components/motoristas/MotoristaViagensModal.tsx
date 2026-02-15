import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Viagem } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, Users, Car, Calendar, X, CalendarDays, Link2 } from 'lucide-react';
import { format } from 'date-fns';

interface MotoristaViagensModalProps {
  motorista: string;
  motoristaId?: string;
  viagens: Viagem[];
  trigger: React.ReactNode;
}

interface EscalaData {
  id: string;
  created_at: string | null;
  escalas: {
    id: string;
    nome: string;
    horario_inicio: string;
    horario_fim: string;
    cor: string | null;
    created_at: string | null;
  } | null;
}

interface VeiculoHistoricoItem {
  id: string;
  tipo_vistoria: string;
  created_at: string;
  veiculo_id: string;
  realizado_por_nome: string | null;
  veiculos: {
    placa: string;
    nome: string | null;
    tipo_veiculo: string;
  } | null;
}

interface VeiculoIntervalo {
  veiculoId: string;
  placa: string;
  nome: string | null;
  tipo: string;
  vinculadoEm: Date;
  desvinculadoEm: Date | null;
  vinculadoPor: string | null;
  desvinculadoPor: string | null;
}

function formatTime(time: string | null): string {
  if (!time) return '-';
  return time.substring(0, 5);
}

function formatDateTime(dt: string | null): string {
  if (!dt) return '-';
  try {
    return format(new Date(dt), 'dd/MM HH:mm');
  } catch {
    return dt.substring(0, 16).replace('T', ' ');
  }
}

function calcDuracao(inicio: Date, fim: Date): string {
  const diffMs = fim.getTime() - inicio.getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function getStatusBadge(viagem: Viagem) {
  if (viagem.encerrado) {
    return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">Finalizada</Badge>;
  }
  if (viagem.h_retorno) {
    return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Retornou</Badge>;
  }
  if (viagem.h_chegada) {
    return <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-amber-500/30">No local</Badge>;
  }
  return <Badge variant="default" className="bg-purple-500/20 text-purple-500 border-purple-500/30">Em rota</Badge>;
}

function buildIntervalos(historico: VeiculoHistoricoItem[]): VeiculoIntervalo[] {
  const intervalos: VeiculoIntervalo[] = [];
  const openMap = new Map<string, VeiculoHistoricoItem>();

  for (const item of historico) {
    if (item.tipo_vistoria === 'vinculacao') {
      openMap.set(item.veiculo_id, item);
    } else if (item.tipo_vistoria === 'desvinculacao') {
      const open = openMap.get(item.veiculo_id);
      if (open) {
        intervalos.push({
          veiculoId: item.veiculo_id,
          placa: open.veiculos?.placa || item.veiculos?.placa || '?',
          nome: open.veiculos?.nome || item.veiculos?.nome || null,
          tipo: open.veiculos?.tipo_veiculo || item.veiculos?.tipo_veiculo || 'Van',
          vinculadoEm: new Date(open.created_at),
          desvinculadoEm: new Date(item.created_at),
          vinculadoPor: open.realizado_por_nome || null,
          desvinculadoPor: item.realizado_por_nome || null,
        });
        openMap.delete(item.veiculo_id);
      } else {
        // desvinculacao sem vinculacao conhecida
        intervalos.push({
          veiculoId: item.veiculo_id,
          placa: item.veiculos?.placa || '?',
          nome: item.veiculos?.nome || null,
          tipo: item.veiculos?.tipo_veiculo || 'Van',
          vinculadoEm: new Date(item.created_at),
          desvinculadoEm: new Date(item.created_at),
          vinculadoPor: null,
          desvinculadoPor: item.realizado_por_nome || null,
        });
      }
    }
  }

  // Still open (vinculacao without desvinculacao)
  for (const [, item] of openMap) {
    intervalos.push({
      veiculoId: item.veiculo_id,
      placa: item.veiculos?.placa || '?',
      nome: item.veiculos?.nome || null,
      tipo: item.veiculos?.tipo_veiculo || 'Van',
      vinculadoEm: new Date(item.created_at),
      desvinculadoEm: null,
      vinculadoPor: item.realizado_por_nome || null,
      desvinculadoPor: null,
    });
  }

  return intervalos.sort((a, b) => b.vinculadoEm.getTime() - a.vinculadoEm.getTime());
}

function getVeiculosDuranteEscala(
  escalaCreatedAt: string | null,
  escalaHorarioInicio: string,
  escalaHorarioFim: string,
  intervalos: VeiculoIntervalo[]
): VeiculoIntervalo[] {
  if (!escalaCreatedAt) return [];

  const escalaDate = new Date(escalaCreatedAt);
  const dateStr = format(escalaDate, 'yyyy-MM-dd');
  
  const escalaInicio = new Date(`${dateStr}T${escalaHorarioInicio}`);
  const escalaFim = new Date(`${dateStr}T${escalaHorarioFim}`);
  
  // If fim < inicio, it crosses midnight
  if (escalaFim <= escalaInicio) {
    escalaFim.setDate(escalaFim.getDate() + 1);
  }

  return intervalos.filter(iv => {
    const ivFim = iv.desvinculadoEm || new Date();
    return iv.vinculadoEm < escalaFim && ivFim > escalaInicio;
  });
}

export function MotoristaViagensModal({ motorista, motoristaId, viagens, trigger }: MotoristaViagensModalProps) {
  const [open, setOpen] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [escalas, setEscalas] = useState<EscalaData[]>([]);
  const [veiculoHistorico, setVeiculoHistorico] = useState<VeiculoHistoricoItem[]>([]);
  const [loadingEscalas, setLoadingEscalas] = useState(false);
  const [loadingVeiculos, setLoadingVeiculos] = useState(false);

  // Fetch escalas e veiculos ao abrir
  useEffect(() => {
    if (!open || !motoristaId) return;

    setLoadingEscalas(true);
    supabase
      .from('escala_motoristas')
      .select('id, created_at, escalas(id, nome, horario_inicio, horario_fim, cor, created_at)')
      .eq('motorista_id', motoristaId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEscalas((data as unknown as EscalaData[]) || []);
        setLoadingEscalas(false);
      });

    setLoadingVeiculos(true);
    supabase
      .from('veiculo_vistoria_historico')
      .select('id, tipo_vistoria, created_at, veiculo_id, realizado_por_nome, veiculos(placa, nome, tipo_veiculo)')
      .eq('motorista_id', motoristaId)
      .in('tipo_vistoria', ['vinculacao', 'desvinculacao'])
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setVeiculoHistorico((data as unknown as VeiculoHistoricoItem[]) || []);
        setLoadingVeiculos(false);
      });
  }, [open, motoristaId]);

  const intervalos = buildIntervalos(veiculoHistorico);

  const viagensDoMotorista = viagens
    .filter(v => v.motorista === motorista)
    .sort((a, b) => {
      if (!a.h_pickup && !b.h_pickup) return 0;
      if (!a.h_pickup) return 1;
      if (!b.h_pickup) return -1;
      return a.h_pickup.localeCompare(b.h_pickup);
    });

  const viagensFiltradas = filtroData
    ? viagensDoMotorista.filter(v => {
        const dataViagem = v.h_inicio_real
          ? v.h_inicio_real.substring(0, 10)
          : v.data_criacao?.substring(0, 10);
        return dataViagem === filtroData;
      })
    : viagensDoMotorista;

  const finalizadas = viagensFiltradas.filter(v => v.encerrado).length;
  const ativas = viagensFiltradas.filter(v => !v.encerrado).length;
  const totalPax = viagensFiltradas.reduce((acc, v) => acc + (v.qtd_pax || 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
              {motorista.charAt(0)}
            </div>
            <div>
              <span>Detalhes de {motorista}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="viagens" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="viagens" className="flex-1 gap-1">
              <Car className="w-3.5 h-3.5" />
              Viagens
            </TabsTrigger>
            <TabsTrigger value="escalas" className="flex-1 gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Escalas
            </TabsTrigger>
            <TabsTrigger value="veiculos" className="flex-1 gap-1">
              <Link2 className="w-3.5 h-3.5" />
              Veículos
            </TabsTrigger>
          </TabsList>

          {/* === ABA VIAGENS === */}
          <TabsContent value="viagens">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="w-auto"
              />
              {filtroData && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFiltroData('')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {viagensFiltradas.length} viagen{viagensFiltradas.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Car className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">{viagensFiltradas.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Passageiros</p>
                  <p className="font-semibold">{totalPax}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                  <p className="font-semibold">{ativas}</p>
                </div>
              </div>
            </div>

            {viagensFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma viagem {filtroData ? 'nesta data' : 'registrada'}.</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Chegada</TableHead>
                      <TableHead>Retorno</TableHead>
                      <TableHead>Pax</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Ponto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viagensFiltradas.map((viagem) => (
                      <TableRow key={viagem.id}>
                        <TableCell>{getStatusBadge(viagem)}</TableCell>
                        <TableCell className="font-mono">{formatTime(viagem.h_pickup)}</TableCell>
                        <TableCell className="font-mono">{formatTime(viagem.h_chegada)}</TableCell>
                        <TableCell className="font-mono">{formatTime(viagem.h_retorno)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            {viagem.qtd_pax || 0}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{viagem.placa || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                          {viagem.ponto_embarque || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          {/* === ABA ESCALAS === */}
          <TabsContent value="escalas">
            {!motoristaId ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>ID do motorista não disponível.</p>
              </div>
            ) : loadingEscalas ? (
              <div className="text-center py-8 text-muted-foreground">Carregando escalas...</div>
            ) : escalas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma escala encontrada.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {escalas.map((em) => {
                    const escala = em.escalas;
                    if (!escala) return null;

                    const veiculosDaEscala = getVeiculosDuranteEscala(
                      em.created_at,
                      escala.horario_inicio,
                      escala.horario_fim,
                      intervalos
                    );

                    return (
                      <div key={em.id} className="rounded-lg border p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: escala.cor || 'hsl(var(--primary))' }}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{escala.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {escala.horario_inicio?.substring(0, 5)} - {escala.horario_fim?.substring(0, 5)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {em.created_at ? formatDateTime(em.created_at) : '-'}
                          </span>
                        </div>

                        {veiculosDaEscala.length > 0 ? (
                          <div className="mt-2 pl-6 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Veículos:</p>
                            {veiculosDaEscala.map((iv, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Car className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-mono text-xs">{iv.placa}</span>
                                {iv.nome && <span className="text-xs text-muted-foreground">"{iv.nome}"</span>}
                                {iv.vinculadoPor && <span className="text-xs text-muted-foreground">por {iv.vinculadoPor}</span>}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {format(iv.vinculadoEm, 'HH:mm')} - {iv.desvinculadoEm ? format(iv.desvinculadoEm, 'HH:mm') : 'ativo'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground pl-6 mt-1">Sem veículo vinculado neste período</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* === ABA VEÍCULOS === */}
          <TabsContent value="veiculos">
            {!motoristaId ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>ID do motorista não disponível.</p>
              </div>
            ) : loadingVeiculos ? (
              <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
            ) : intervalos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum histórico de vinculação.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {intervalos.map((iv, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{iv.placa}</span>
                        {iv.nome && <span className="text-sm text-muted-foreground">"{iv.nome}"</span>}
                        <Badge variant="outline" className="text-xs ml-auto">{iv.tipo}</Badge>
                      </div>
                      <div className="pl-7 text-sm text-muted-foreground space-y-0.5">
                        <p>
                          {iv.vinculadoPor && <span className="font-medium text-foreground">{iv.vinculadoPor} </span>}
                          vinculou: {format(iv.vinculadoEm, 'dd/MM HH:mm')}
                        </p>
                        {iv.desvinculadoEm ? (
                          <p>
                            {iv.desvinculadoPor && <span className="font-medium text-foreground">{iv.desvinculadoPor} </span>}
                            desvinculou: {format(iv.desvinculadoEm, 'dd/MM HH:mm')}
                            <span className="ml-2 text-foreground font-medium">
                              ({calcDuracao(iv.vinculadoEm, iv.desvinculadoEm)} de uso)
                            </span>
                          </p>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">Ativo</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
