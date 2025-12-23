import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ViagemLog } from '@/lib/types/viagem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, MapPin, RotateCcw, CheckCircle, XCircle, User } from 'lucide-react';

interface LogsPanelProps {
  eventoId: string;
}

const acaoConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  inicio: { label: 'Iniciou', icon: <Play className="h-3 w-3" />, color: 'bg-blue-500' },
  chegada: { label: 'Chegou', icon: <MapPin className="h-3 w-3" />, color: 'bg-amber-500' },
  retorno: { label: 'Retornou', icon: <RotateCcw className="h-3 w-3" />, color: 'bg-green-500' },
  encerramento: { label: 'Encerrou', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-600' },
  cancelamento: { label: 'Cancelou', icon: <XCircle className="h-3 w-3" />, color: 'bg-red-500' },
};

interface LogComViagem extends ViagemLog {
  viagem?: {
    motorista: string;
    placa: string;
  };
  profile?: {
    full_name: string;
  };
}

export function LogsPanel({ eventoId }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogComViagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Realtime subscription
    const channel = supabase
      .channel('viagem-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'viagem_logs' },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoId]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('viagem_logs')
      .select(`
        *,
        viagem:viagens!viagem_id(motorista, placa, evento_id),
        profile:profiles!user_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Filtrar por evento
    const filtered = (data || []).filter((log: any) => 
      log.viagem?.evento_id === eventoId
    );

    setLogs(filtered as any[]);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-4">
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            Nenhuma atividade registrada
          </p>
        ) : (
          logs.map(log => {
            const config = acaoConfig[log.acao] || { label: log.acao, icon: null, color: 'bg-gray-500' };
            
            return (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <Badge className={`${config.color} text-white shrink-0`}>
                  {config.icon}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="font-medium">{log.viagem?.motorista}</span>
                    <span className="text-muted-foreground"> ({log.viagem?.placa})</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {log.profile?.full_name || 'Sistema'} •{' '}
                    {formatDistanceToNow(new Date(log.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
