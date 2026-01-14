import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Database, Bell, Clock, CheckCircle, Eye, EyeOff, Loader2, UserCheck, Sun } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEventos } from '@/hooks/useEventos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Configuracoes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById, refetch } = useEventos();
  const evento = eventoId ? getEventoById(eventoId) : null;
  
  const [visivelPublico, setVisivelPublico] = useState(true);
  const [habilitarCheckin, setHabilitarCheckin] = useState(false);
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const [saving, setSaving] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);

  useEffect(() => {
    if (evento) {
      setVisivelPublico(evento.visivel_publico ?? true);
    }
    // Fetch additional settings
    const fetchSettings = async () => {
      if (!eventoId) return;
      const { data } = await supabase
        .from('eventos')
        .select('habilitar_checkin, horario_virada_dia')
        .eq('id', eventoId)
        .single();
      setHabilitarCheckin(data?.habilitar_checkin ?? false);
      // Format time from HH:mm:ss to HH:mm
      const virada = data?.horario_virada_dia || '04:00:00';
      setHorarioVirada(virada.substring(0, 5));
    };
    fetchSettings();
  }, [evento, eventoId]);

  const handleToggleVisibilidade = async (checked: boolean) => {
    if (!eventoId) return;
    
    setSaving(true);
    setVisivelPublico(checked);

    const { error } = await supabase
      .from('eventos')
      .update({ visivel_publico: checked })
      .eq('id', eventoId);

    if (error) {
      console.error('Erro ao atualizar visibilidade:', error);
      toast.error('Erro ao atualizar configuração');
      setVisivelPublico(!checked);
    } else {
      toast.success(checked ? 'Evento visível no painel público' : 'Evento oculto do painel público');
      refetch();
    }
    
    setSaving(false);
  };

  const handleToggleCheckin = async (checked: boolean) => {
    if (!eventoId) return;
    
    setSavingCheckin(true);
    setHabilitarCheckin(checked);

    const { error } = await supabase
      .from('eventos')
      .update({ habilitar_checkin: checked })
      .eq('id', eventoId);

    if (error) {
      console.error('Erro ao atualizar check-in:', error);
      toast.error('Erro ao atualizar configuração');
      setHabilitarCheckin(!checked);
    } else {
      toast.success(checked ? 'Check-in/check-out habilitado' : 'Check-in/check-out desabilitado');
      refetch();
    }
    
    setSavingCheckin(false);
  };

  const handleSaveHorarioVirada = async () => {
    if (!eventoId) return;
    
    setSavingHorario(true);

    const { error } = await supabase
      .from('eventos')
      .update({ horario_virada_dia: horarioVirada + ':00' })
      .eq('id', eventoId);

    if (error) {
      console.error('Erro ao atualizar horário de virada:', error);
      toast.error('Erro ao salvar configuração');
    } else {
      toast.success(`Dia operacional agora encerra às ${horarioVirada}`);
      refetch();
    }
    
    setSavingHorario(false);
  };

  return (
    <EventLayout>
      <div className="p-8 max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        
        {/* Visibilidade Pública */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {visivelPublico ? (
                <Eye className="w-5 h-5 text-primary" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base">Visibilidade Pública</CardTitle>
                <CardDescription>Exibir este evento no painel público para passageiros</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="visivel-publico" className="text-sm font-medium">
                  Mostrar no painel público
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, passageiros podem ver as viagens deste evento em /painel
                </p>
              </div>
              <div className="flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  id="visivel-publico"
                  checked={visivelPublico}
                  onCheckedChange={handleToggleVisibilidade}
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in/Check-out de Motoristas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCheck className={`w-5 h-5 ${habilitarCheckin ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <CardTitle className="text-base">Check-in/Check-out de Motoristas</CardTitle>
                <CardDescription>Controle de presença diária dos motoristas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="habilitar-checkin" className="text-sm font-medium">
                  Habilitar controle de presença
                </Label>
                <p className="text-xs text-muted-foreground">
                  Motoristas deverão fazer check-in ao iniciar e check-out ao finalizar o dia
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingCheckin && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  id="habilitar-checkin"
                  checked={habilitarCheckin}
                  onCheckedChange={handleToggleCheckin}
                  disabled={savingCheckin}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dia Operacional */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Dia Operacional</CardTitle>
                <CardDescription>
                  Horário de "virada" do dia (atividades após meia-noite e antes deste horário contam como dia anterior)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="horario-virada" className="text-sm font-medium whitespace-nowrap">
                  Encerra às:
                </Label>
                <Input
                  id="horario-virada"
                  type="time"
                  value={horarioVirada}
                  onChange={(e) => setHorarioVirada(e.target.value)}
                  className="w-28"
                />
              </div>
              <Button 
                onClick={handleSaveHorarioVirada} 
                disabled={savingHorario}
                size="sm"
              >
                {savingHorario && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Exemplo:</strong> Se configurado como 04:00, uma viagem feita às 02:00 do dia 14/01 
              será registrada como pertencente ao dia operacional 13/01. Isso é útil para eventos que 
              se estendem após a meia-noite.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Conexão com Banco de Dados</CardTitle>
                  <CardDescription>Status da conexão com Supabase</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-status-ok/10 text-status-ok border-status-ok/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O sistema está conectado ao banco de dados Supabase e recebendo dados em tempo real.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Intervalo de Atualização</CardTitle>
                <CardDescription>Frequência de atualização dos dados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">30 segundos</Badge>
              <span className="text-sm text-muted-foreground">Atualização automática + Realtime</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configurações de Alertas</CardTitle>
                <CardDescription>Limiares para alertas baseados na média do motorista</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-status-alert/10 rounded-lg">
              <div>
                <p className="text-sm font-medium">Alerta</p>
                <p className="text-xs text-muted-foreground">Ultrapassa a média em mais de 15 minutos</p>
              </div>
              <Badge className="bg-status-alert text-status-alert-foreground">+15 min</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-critical/10 rounded-lg">
              <div>
                <p className="text-sm font-medium">Crítico</p>
                <p className="text-xs text-muted-foreground">Ultrapassa a média em mais de 25 minutos</p>
              </div>
              <Badge className="bg-status-critical text-status-critical-foreground">+25 min</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </EventLayout>
  );
}
