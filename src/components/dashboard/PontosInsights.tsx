import { useMemo } from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Viagem } from '@/lib/types/viagem';

interface PontoMetrica {
  ponto: string;
  viagensAtivas: number;
  totalPax: number;
  totalViagens: number;
}

interface PontosInsightsProps {
  viagens: Viagem[];
  viagensAtivas: Viagem[];
}

export function PontosInsights({ viagens, viagensAtivas }: PontosInsightsProps) {
  const pontosMetricas = useMemo(() => {
    const metricas = new Map<string, PontoMetrica>();
    
    // Count from all trips
    viagens.forEach(v => {
      const ponto = v.ponto_embarque || 'Não informado';
      const existing = metricas.get(ponto) || { ponto, viagensAtivas: 0, totalPax: 0, totalViagens: 0 };
      existing.totalViagens += 1;
      existing.totalPax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      metricas.set(ponto, existing);
    });

    // Count active trips
    viagensAtivas.forEach(v => {
      const ponto = v.ponto_embarque || 'Não informado';
      const existing = metricas.get(ponto);
      if (existing) {
        existing.viagensAtivas += 1;
      }
    });

    return Array.from(metricas.values()).sort((a, b) => b.viagensAtivas - a.viagensAtivas);
  }, [viagens, viagensAtivas]);

  const pontoMaisMovimentado = pontosMetricas[0];
  const top5Pontos = pontosMetricas.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-primary" />
          Insights em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ponto mais movimentado */}
        {pontoMaisMovimentado && pontoMaisMovimentado.viagensAtivas > 0 && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Ponto mais movimentado agora</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-semibold">{pontoMaisMovimentado.ponto}</span>
              </div>
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {pontoMaisMovimentado.viagensAtivas} ativas
              </Badge>
            </div>
          </div>
        )}

        {/* Top 5 pontos */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Ranking de Pontos
          </p>
          {top5Pontos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhuma viagem registrada</p>
          ) : (
            <div className="space-y-2">
              {top5Pontos.map((ponto, index) => (
                <div 
                  key={ponto.ponto} 
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">
                      {index + 1}º
                    </span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {ponto.ponto}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {ponto.totalPax}
                    </span>
                    {ponto.viagensAtivas > 0 && (
                      <Badge variant="outline" className="text-status-ok border-status-ok">
                        {ponto.viagensAtivas} ativas
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
