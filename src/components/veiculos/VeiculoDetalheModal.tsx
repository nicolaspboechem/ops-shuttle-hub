import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  X,
  Bus,
  Car,
  Users,
  MapPin,
  Clock,
  Gauge,
  Fuel,
  AlertTriangle,
  UserCheck,
  ClipboardCheck,
  Calendar,
  Building,
  Info,
  History,
  Pencil,
  Check,
  X as XIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VeiculoStatusBadge, FuelIndicator, AvariaIndicator } from './VeiculoStatusBadge';
import { VistoriaHistoricoCard } from './VistoriaHistoricoCard';
import { VistoriaDetalheModal } from './VistoriaDetalheModal';
import { useVistoriaHistorico, VistoriaHistorico } from '@/hooks/useVistoriaHistorico';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Viagem } from '@/lib/types/viagem';
import { Motorista } from '@/hooks/useCadastros';

interface VeiculoPerfil {
  full_name: string | null;
}

interface Veiculo {
  id: string;
  placa: string;
  nome?: string | null;
  tipo_veiculo: string;
  capacidade?: number | null;
  fornecedor?: string | null;
  status?: string | null;
  nivel_combustivel?: string | null;
  possui_avarias?: boolean | null;
  km_inicial?: number | null;
  km_final?: number | null;
  observacoes_gerais?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
  liberado_em?: string | null;
  inspecao_data?: string | null;
  inspecao_dados?: any;
  inspecao_perfil?: VeiculoPerfil | null;
  liberado_perfil?: VeiculoPerfil | null;
}

interface VeiculoDetalheModalProps {
  veiculo: Veiculo | null;
  open: boolean;
  onClose: () => void;
  viagens: Viagem[];
  motoristas: Motorista[];
  eventoId?: string;
}

export function VeiculoDetalheModal({
  veiculo,
  open,
  onClose,
  viagens,
  motoristas,
  eventoId
}: VeiculoDetalheModalProps) {
  const [selectedVistoria, setSelectedVistoria] = useState<VistoriaHistorico | null>(null);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeValue, setNomeValue] = useState('');

  // Buscar histórico de vistorias
  const { data: vistoriasHistorico, isLoading: vistoriasLoading } = useVistoriaHistorico(veiculo?.id || null);

  // Buscar histórico de uso (presença)
  const { data: presencasHistorico, isLoading: presencasLoading } = useQuery({
    queryKey: ['veiculo-presenca-historico', veiculo?.id],
    queryFn: async () => {
      if (!veiculo?.id) return [];
      
      const { data, error } = await supabase
        .from('motorista_presenca')
        .select(`
          *,
          motorista:motoristas(nome, telefone)
        `)
        .eq('veiculo_id', veiculo.id)
        .order('data', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!veiculo?.id && open
  });

  // Calcular métricas
  const metricas = useMemo(() => {
    if (!veiculo) return null;

    const viagensVeiculo = viagens.filter(v => v.placa === veiculo.placa);
    const totalViagens = viagensVeiculo.length;
    const totalPax = viagensVeiculo.reduce((sum, v) => 
      sum + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
    
    const avariasCount = vistoriasHistorico?.filter(v => v.possui_avarias).length || 0;
    
    const motoristasUsaram = new Set(presencasHistorico?.map(p => p.motorista_id) || []).size;

    return {
      totalViagens,
      totalPax,
      avariasCount,
      motoristasUsaram
    };
  }, [veiculo, viagens, vistoriasHistorico, presencasHistorico]);

  // Motorista vinculado
  const motoristaVinculado = useMemo(() => {
    if (!veiculo) return null;
    return motoristas.find(m => m.veiculo_id === veiculo.id);
  }, [veiculo, motoristas]);

  if (!veiculo) return null;

  const TipoIcon = (veiculo.tipo_veiculo?.toLowerCase().includes('van') || 
    veiculo.tipo_veiculo === 'Sedan' || 
    veiculo.tipo_veiculo === 'SUV') ? Car : Bus;

  const calcularDuracao = (checkin: string | null, checkout: string | null) => {
    if (!checkin || !checkout) return null;
    const minutos = differenceInMinutes(new Date(checkout), new Date(checkin));
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h${mins > 0 ? mins + 'min' : ''}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-xl shrink-0",
                veiculo.tipo_veiculo === 'Ônibus' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              )}>
                <TipoIcon className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                {editingNome ? (
                  <div className="flex items-center gap-2 mb-1">
                    <Input
                      value={nomeValue}
                      onChange={e => setNomeValue(e.target.value)}
                      placeholder="Nome/Apelido"
                      className="h-8 text-lg font-semibold"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          supabase.from('veiculos').update({ nome: nomeValue.trim() || null }).eq('id', veiculo.id).then(({ error }) => {
                            if (error) { toast.error('Erro ao salvar nome'); }
                            else { toast.success('Nome atualizado'); veiculo.nome = nomeValue.trim() || undefined; }
                            setEditingNome(false);
                          });
                        }
                        if (e.key === 'Escape') setEditingNome(false);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      supabase.from('veiculos').update({ nome: nomeValue.trim() || null }).eq('id', veiculo.id).then(({ error }) => {
                        if (error) { toast.error('Erro ao salvar nome'); }
                        else { toast.success('Nome atualizado'); veiculo.nome = nomeValue.trim() || undefined; }
                        setEditingNome(false);
                      });
                    }}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingNome(false)}>
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <DialogTitle className="text-xl mb-1 flex items-center gap-2">
                    {veiculo.nome || veiculo.placa}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setNomeValue(veiculo.nome || '');
                      setEditingNome(true);
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTitle>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {veiculo.nome && (
                    <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                      {veiculo.placa}
                    </code>
                  )}
                  <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
                  {veiculo.fornecedor && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {veiculo.fornecedor}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Card className="bg-card/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Viagens</p>
                    <p className="text-lg font-bold">{metricas?.totalViagens || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">PAX Total</p>
                    <p className="text-lg font-bold">{metricas?.totalPax || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn(
                "bg-card/50",
                (metricas?.avariasCount || 0) > 0 && "border-destructive/50"
              )}>
                <CardContent className="p-3 flex items-center gap-3">
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    (metricas?.avariasCount || 0) > 0 ? "text-destructive" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="text-xs text-muted-foreground">Avarias</p>
                    <p className="text-lg font-bold">{metricas?.avariasCount || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <Fuel className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Combustível</p>
                    <p className="text-sm font-medium">{veiculo.nivel_combustivel || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs defaultValue="resumo" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-3">
              <TabsTrigger value="resumo" className="flex items-center gap-1.5">
                <Info className="h-4 w-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="uso" className="flex items-center gap-1.5">
                <History className="h-4 w-4" />
                Histórico de Uso
              </TabsTrigger>
              <TabsTrigger value="vistorias" className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" />
                Vistorias
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 py-4">
              {/* Aba Resumo */}
              <TabsContent value="resumo" className="mt-0 space-y-4">
                <div className="grid gap-4">
                  {/* Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <VeiculoStatusBadge status={veiculo.status} />
                      <AvariaIndicator hasAvarias={veiculo.possui_avarias} />
                    </div>
                  </div>

                  {/* Motorista Vinculado */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <span className="text-sm text-muted-foreground">Motorista Vinculado</span>
                    {motoristaVinculado ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <UserCheck className="h-4 w-4" />
                        <span className="font-medium">{motoristaVinculado.nome}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem motorista</span>
                    )}
                  </div>

                  {/* Capacidade */}
                  {veiculo.capacidade && (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <span className="text-sm text-muted-foreground">Capacidade</span>
                      <span className="font-medium">{veiculo.capacidade} lugares</span>
                    </div>
                  )}

                  {/* KM */}
                  {(veiculo.km_inicial != null || veiculo.km_final != null) && (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Gauge className="h-4 w-4" />
                        Quilometragem
                      </span>
                      <div className="text-right">
                        <span className="font-mono">
                          {veiculo.km_inicial?.toLocaleString('pt-BR') || '-'} → {veiculo.km_final?.toLocaleString('pt-BR') || '-'}
                        </span>
                        {veiculo.km_inicial != null && veiculo.km_final != null && (
                          <p className="text-xs text-primary font-semibold">
                            +{(veiculo.km_final - veiculo.km_inicial).toLocaleString('pt-BR')} km
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Última Vistoria */}
                  {veiculo.inspecao_data && (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <ClipboardCheck className="h-4 w-4" />
                        Última Inspeção
                      </span>
                      <div className="text-right">
                        <span className="text-sm">
                          {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {veiculo.inspecao_perfil?.full_name && (
                          <p className="text-xs text-muted-foreground">
                            por <span className="font-medium">{veiculo.inspecao_perfil.full_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Liberado em */}
                  {veiculo.liberado_em && (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <span className="text-sm text-muted-foreground">Liberado em</span>
                      <div className="text-right">
                        <span className="text-sm">
                          {format(parseISO(veiculo.liberado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {veiculo.liberado_perfil?.full_name && (
                          <p className="text-xs text-muted-foreground">
                            por <span className="font-medium">{veiculo.liberado_perfil.full_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Avarias Ativas */}
                  {veiculo.possui_avarias && (
                    <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                      <h4 className="font-medium flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Avarias Ativas
                      </h4>
                      
                      {(() => {
                        const dados = veiculo.inspecao_dados;
                        const areasComAvaria = dados?.areas?.filter((a: any) => a.possuiAvaria) || [];
                        
                        return areasComAvaria.length > 0 ? (
                          <div className="space-y-3">
                            {areasComAvaria.map((area: any, idx: number) => (
                              <div 
                                key={idx}
                                className="p-3 rounded-lg border border-destructive/20 bg-background"
                              >
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit mb-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  {area.nome}
                                </Badge>
                                {area.descricao && (
                                  <p className="text-sm text-muted-foreground">{area.descricao}</p>
                                )}
                                {area.fotos?.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {area.fotos.slice(0, 4).map((url: string, i: number) => (
                                      <img 
                                        key={i}
                                        src={url} 
                                        alt=""
                                        className="w-12 h-12 rounded object-cover border"
                                      />
                                    ))}
                                    {area.fotos.length > 4 && (
                                      <span className="text-xs text-muted-foreground flex items-center">
                                        +{area.fotos.length - 4}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Veículo marcado com avarias, mas sem detalhes registrados.
                          </p>
                        );
                      })()}
                      
                      {/* Mostrar data do registro e quem registrou */}
                      {veiculo.inspecao_data && (
                        <p className="text-xs text-muted-foreground pt-2 border-t border-destructive/20 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Registrado em {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {veiculo.inspecao_perfil?.full_name && (
                            <span> por <strong>{veiculo.inspecao_perfil.full_name}</strong></span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Observações */}
                  {veiculo.observacoes_gerais && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm font-medium mb-1">Observações</p>
                      <p className="text-sm text-muted-foreground">{veiculo.observacoes_gerais}</p>
                    </div>
                  )}

                  {/* Datas de criação/atualização */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t">
                    {veiculo.data_criacao && (
                      <div>
                        <span>Cadastrado em: </span>
                        <span className="font-medium">
                          {format(parseISO(veiculo.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {veiculo.data_atualizacao && (
                      <div>
                        <span>Atualizado em: </span>
                        <span className="font-medium">
                          {format(parseISO(veiculo.data_atualizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Aba Histórico de Uso */}
              <TabsContent value="uso" className="mt-0">
                {presencasLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando histórico...
                  </div>
                ) : presencasHistorico && presencasHistorico.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead className="text-center">Check-in</TableHead>
                        <TableHead className="text-center">Check-out</TableHead>
                        <TableHead className="text-center">Duração</TableHead>
                        <TableHead>Obs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presencasHistorico.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {format(parseISO(p.data), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3 w-3 text-muted-foreground" />
                              <span>{p.motorista?.nome || 'Desconhecido'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {p.checkin_at 
                              ? format(parseISO(p.checkin_at), "HH:mm") 
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {p.checkout_at 
                              ? format(parseISO(p.checkout_at), "HH:mm") 
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {calcularDuracao(p.checkin_at, p.checkout_at) || '-'}
                          </TableCell>
                          <TableCell>
                            {p.observacao_checkout ? (
                              <Badge variant="outline" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                                Obs
                              </Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum registro de uso encontrado</p>
                  </div>
                )}
              </TabsContent>

              {/* Aba Vistorias */}
              <TabsContent value="vistorias" className="mt-0 space-y-3">
                {vistoriasLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando vistorias...
                  </div>
                ) : vistoriasHistorico && vistoriasHistorico.length > 0 ? (
                  vistoriasHistorico.map(vistoria => (
                    <VistoriaHistoricoCard
                      key={vistoria.id}
                      vistoria={vistoria}
                      onVerFotos={setSelectedVistoria}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma vistoria registrada</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhe da vistoria */}
      <VistoriaDetalheModal
        vistoria={selectedVistoria}
        open={!!selectedVistoria}
        onClose={() => setSelectedVistoria(null)}
      />
    </>
  );
}
