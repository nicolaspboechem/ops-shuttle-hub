import { Bus, Users, Clock, MapPin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useViagens, useCalculos } from '@/hooks/useViagens';
import { formatarMinutos, calcularTempoViagem } from '@/lib/utils/calculadores';
import { Skeleton } from '@/components/ui/skeleton';
import { Viagem } from '@/lib/types/viagem';

interface VeiculoStats {
  placa: string;
  veiculo: string;
  tipo: string;
  totalViagens: number;
  totalPax: number;
  tempoMedio: number;
  ultimaViagem: Viagem | null;
  ativo: boolean;
}

export default function Veiculos() {
  const { viagens, loading, lastUpdate, refetch } = useViagens();
  const { viagensAtivas } = useCalculos(viagens);

  // Calculate vehicle stats
  const veiculosStats: VeiculoStats[] = [];
  const placas = [...new Set(viagens.map(v => v.placa))];
  
  placas.forEach(placa => {
    const viagensVeiculo = viagens.filter(v => v.placa === placa);
    const primeiraViagem = viagensVeiculo[0];
    
    const tempos = viagensVeiculo
      .filter(v => v.h_chegada)
      .map(v => calcularTempoViagem(v.h_pickup, v.h_chegada!));
    
    const tempoMedio = tempos.length > 0 
      ? tempos.reduce((a, b) => a + b, 0) / tempos.length 
      : 0;

    veiculosStats.push({
      placa,
      veiculo: primeiraViagem.veiculo,
      tipo: primeiraViagem.tipo_veiculo,
      totalViagens: viagensVeiculo.length,
      totalPax: viagensVeiculo.reduce((sum, v) => sum + v.qtd_pax + v.qtd_pax_retorno, 0),
      tempoMedio,
      ultimaViagem: viagensVeiculo[viagensVeiculo.length - 1],
      ativo: viagensAtivas.some(v => v.placa === placa)
    });
  });

  const sortedVeiculos = veiculosStats.sort((a, b) => {
    // Active first, then by total trips
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
    return b.totalViagens - a.totalViagens;
  });

  if (loading) {
    return (
      <MainLayout>
        <Header title="Veículos" />
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Veículos"
        subtitle={`${veiculosStats.length} veículos cadastrados`}
        lastUpdate={lastUpdate}
        onRefresh={refetch}
      />
      
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedVeiculos.map((veiculo) => (
            <Card key={veiculo.placa} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                      veiculo.tipo === 'Ônibus' ? 'bg-primary/10 text-primary' : 'bg-status-ok/10 text-status-ok'
                    }`}>
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{veiculo.veiculo}</CardTitle>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {veiculo.placa}
                      </code>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {veiculo.tipo}
                    </Badge>
                    {veiculo.ativo && (
                      <Badge className="bg-status-ok text-status-ok-foreground text-xs animate-pulse-soft">
                        Ativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Bus className="w-3.5 h-3.5" />
                      <span className="text-xs">Viagens</span>
                    </div>
                    <p className="text-lg font-semibold">{veiculo.totalViagens}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">PAX</span>
                    </div>
                    <p className="text-lg font-semibold">{veiculo.totalPax}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">Média</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatarMinutos(veiculo.tempoMedio)}
                    </p>
                  </div>
                </div>

                {/* Last Trip Info */}
                {veiculo.ultimaViagem && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Última viagem</p>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate">{veiculo.ultimaViagem.ponto_embarque}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {veiculo.ultimaViagem.motorista} • {veiculo.ultimaViagem.h_pickup}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
