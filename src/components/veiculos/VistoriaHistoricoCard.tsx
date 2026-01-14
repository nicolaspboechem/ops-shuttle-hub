import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  ArrowRight, 
  User, 
  AlertTriangle, 
  Camera, 
  ClipboardCheck,
  LogOut,
  RefreshCw,
  Check,
  Fuel,
  Gauge
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VistoriaHistorico } from '@/hooks/useVistoriaHistorico';

interface VistoriaHistoricoCardProps {
  vistoria: VistoriaHistorico;
  onVerFotos: (vistoria: VistoriaHistorico) => void;
}

const statusColors: Record<string, string> = {
  liberado: 'bg-emerald-500',
  pendente: 'bg-destructive',
  em_inspecao: 'bg-amber-500',
  manutencao: 'bg-zinc-500'
};

const statusLabels: Record<string, string> = {
  liberado: 'Liberado',
  pendente: 'Pendente',
  em_inspecao: 'Em Inspeção',
  manutencao: 'Manutenção'
};

const tipoVistoriaConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  inspecao: { label: 'Inspeção Inicial', icon: ClipboardCheck, color: 'bg-primary' },
  're-vistoria': { label: 'Re-vistoria', icon: RefreshCw, color: 'bg-blue-500' },
  checkout: { label: 'Check-out', icon: LogOut, color: 'bg-amber-500' }
};

export function VistoriaHistoricoCard({ vistoria, onVerFotos }: VistoriaHistoricoCardProps) {
  const config = tipoVistoriaConfig[vistoria.tipo_vistoria] || tipoVistoriaConfig.inspecao;
  const TipoIcon = config.icon;
  
  const totalFotos = (vistoria.fotos_urls?.length || 0) + 
    (vistoria.inspecao_dados?.fotosGerais?.length || 0) +
    (vistoria.inspecao_dados?.areas?.reduce((acc: number, a: any) => acc + (a.fotos?.length || 0), 0) || 0);

  const realizadoPorNome = vistoria.realizado_por_nome || vistoria.profile?.full_name || 'Sistema';

  return (
    <Card className={cn(
      "border-l-4 transition-all hover:shadow-md",
      vistoria.possui_avarias ? "border-l-destructive" : "border-l-emerald-500"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header com data/hora */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(parseISO(vistoria.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
            </span>
          </div>
          <Badge className={cn("flex items-center gap-1", config.color)}>
            <TipoIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>

        {/* Mudança de status */}
        {vistoria.status_anterior && vistoria.status_anterior !== vistoria.status_novo && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", statusColors[vistoria.status_anterior] || 'bg-muted')} />
              {statusLabels[vistoria.status_anterior] || vistoria.status_anterior}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", statusColors[vistoria.status_novo] || 'bg-muted')} />
              {statusLabels[vistoria.status_novo] || vistoria.status_novo}
            </Badge>
          </div>
        )}

        {!vistoria.status_anterior && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", statusColors[vistoria.status_novo] || 'bg-muted')} />
              {statusLabels[vistoria.status_novo] || vistoria.status_novo}
            </Badge>
          </div>
        )}

        {/* Motorista que estava usando */}
        {vistoria.motorista_nome && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300">
              Motorista em uso: <strong>{vistoria.motorista_nome}</strong>
            </span>
          </div>
        )}

        {/* Informações adicionais */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {vistoria.nivel_combustivel && (
            <div className="flex items-center gap-1">
              <Fuel className="h-3.5 w-3.5" />
              <span>{vistoria.nivel_combustivel}</span>
            </div>
          )}
          {vistoria.km_registrado && (
            <div className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              <span>{vistoria.km_registrado.toLocaleString('pt-BR')} km</span>
            </div>
          )}
        </div>

        {/* Avarias */}
        {vistoria.possui_avarias && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span>Avarias registradas</span>
          </div>
        )}

        {/* Fotos */}
        {totalFotos > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onVerFotos(vistoria)}
            className="w-full"
          >
            <Camera className="h-4 w-4 mr-2" />
            Ver {totalFotos} foto{totalFotos > 1 ? 's' : ''}
          </Button>
        )}

        {/* Observações */}
        {vistoria.observacoes && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
            "{vistoria.observacoes}"
          </p>
        )}

        {/* Quem realizou */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
          <Check className="h-3 w-3" />
          <span>Realizado por: <span className="font-medium">{realizadoPorNome}</span></span>
        </div>
      </CardContent>
    </Card>
  );
}
