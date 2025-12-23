import { useMemo, useState } from 'react';
import { Bus, Users, Clock, Activity, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Viagem } from '@/lib/types/viagem';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface VeiculosTempoRealProps {
  viagens: Viagem[];
  veiculosCadastrados: any[];
}

export function VeiculosTempoReal({ viagens, veiculosCadastrados }: VeiculosTempoRealProps) {
  const [filtroRota, setFiltroRota] = useState<string>('all');

  // Rotas disponíveis
  const rotasDisponiveis = useMemo(() => {
    const rotas = new Set(viagens.map(v => v.ponto_embarque).filter(Boolean));
    return Array.from(rotas).sort();
  }, [viagens]);

  // Viagens filtradas por rota
  const viagensFiltradas = useMemo(() => {
    if (filtroRota === 'all') return viagens;
    return viagens.filter(v => v.ponto_embarque === filtroRota);
  }, [viagens, filtroRota]);

  // Viagens ativas
  const viagensAtivas = useMemo(() => {
    return viagensFiltradas.filter(v => !v.encerrado);
  }, [viagensFiltradas]);

  // Veículos ativos
  const veiculosAtivos = useMemo(() => {
    const placas = new Set(viagensAtivas.map(v => v.placa).filter(Boolean));
    return placas.size;
  }, [viagensAtivas]);

  // PAX das viagens ativas
  const paxAtivos = useMemo(() => {
    return viagensAtivas.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);
  }, [viagensAtivas]);

  // Tempo médio
  const tempoMedio = useMemo(() => {
    const viagensFinalizadas = viagensFiltradas.filter(v => v.encerrado && v.h_pickup && v.h_chegada);
    if (viagensFinalizadas.length === 0) return 0;
    
    const tempos = viagensFinalizadas.map(v => calcularTempoViagem(v.h_pickup!, v.h_chegada!));
    return tempos.reduce((a, b) => a + b, 0) / tempos.length;
  }, [viagensFiltradas]);

  // KM total dos veículos cadastrados
  const kmTotal = useMemo(() => {
    return veiculosCadastrados.reduce((sum, v) => {
      if (v.km_inicial != null && v.km_final != null) {
        return sum + (v.km_final - v.km_inicial);
      }
      return sum;
    }, 0);
  }, [veiculosCadastrados]);

  // Métricas por veículo
  const metricasVeiculos = useMemo(() => {
    const veiculosMap = new Map<string, {
      placa: string;
      tipoVeiculo: string;
      viagensAtivas: number;
      viagensTotal: number;
      paxAtivos: number;
      paxTotal: number;
    }>();

    viagensFiltradas.forEach(v => {
      const placa = v.placa;
      if (!placa) return;

      const current = veiculosMap.get(placa) || {
        placa,
        tipoVeiculo: v.tipo_veiculo || 'Van',
        viagensAtivas: 0,
        viagensTotal: 0,
        paxAtivos: 0,
        paxTotal: 0
      };

      current.viagensTotal++;
      current.paxTotal += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      
      if (!v.encerrado) {
        current.viagensAtivas++;
        current.paxAtivos += (v.qtd_pax || 0);
      }

      veiculosMap.set(placa, current);
    });

    return Array.from(veiculosMap.values())
      .sort((a, b) => b.viagensAtivas - a.viagensAtivas || b.viagensTotal - a.viagensTotal)
      .slice(0, 10);
  }, [viagensFiltradas]);

  // Dados por hora
  const dadosPorHora = useMemo(() => {
    const horasMap = new Map<number, { hora: string; viagens: number; pax: number }>();
    
    viagensFiltradas.forEach(v => {
      if (!v.h_pickup) return;
      const hora = parseInt(v.h_pickup.split(':')[0]);
      const current = horasMap.get(hora) || { hora: `${hora}h`, viagens: 0, pax: 0 };
      current.viagens++;
      current.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      horasMap.set(hora, current);
    });

    return Array.from(horasMap.values()).sort((a, b) => 
      parseInt(a.hora) - parseInt(b.hora)
    );
  }, [viagensFiltradas]);

  return (
    <div className="space-y-6">
      {/* Filtro por Rota */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar por rota:</span>
          <Select value={filtroRota} onValueChange={setFiltroRota}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as rotas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as rotas</SelectItem>
              {rotasDisponiveis.map(rota => (
                <SelectItem key={rota} value={rota!}>{rota}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtroRota !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Filtrando por: {filtroRota}
          </Badge>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Viagens Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{viagensAtivas.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {viagensFiltradas.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bus className="w-4 h-4" />
              Veículos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{veiculosAtivos}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {veiculosCadastrados.length} cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              PAX Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{paxAtivos}</p>
            <p className="text-xs text-muted-foreground mt-1">
              passageiros em trânsito
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              KM Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kmTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              quilômetros percorridos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAX por Hora */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PAX por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosPorHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dadosPorHora}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hora" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="pax" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                    name="PAX"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Veículos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            {metricasVeiculos.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metricasVeiculos.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    dataKey="placa" 
                    type="category" 
                    className="text-xs" 
                    width={80}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="viagensTotal" 
                    fill="hsl(var(--primary))" 
                    name="Viagens"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Veículos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bus className="w-4 h-4" />
            Ranking de Veículos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricasVeiculos.length > 0 ? (
            <div className="space-y-3">
              {metricasVeiculos.map((v, idx) => (
                <div 
                  key={v.placa} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      idx === 1 ? 'bg-gray-300/30 text-gray-600' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium bg-muted px-1.5 py-0.5 rounded">
                          {v.placa}
                        </code>
                        <Badge variant="outline" className="text-xs">{v.tipoVeiculo}</Badge>
                      </div>
                      {v.viagensAtivas > 0 && (
                        <Badge variant="default" className="text-xs mt-0.5">
                          {v.viagensAtivas} ativa{v.viagensAtivas > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{v.viagensTotal}</p>
                      <p className="text-xs text-muted-foreground">viagens</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{v.paxTotal}</p>
                      <p className="text-xs text-muted-foreground">PAX</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum veículo com viagens registradas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
