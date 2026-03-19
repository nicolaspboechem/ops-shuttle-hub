import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Database, 
  Bell, 
  Clock, 
  CheckCircle, 
  Eye, 
  MapPin, 
  Copy, 
  ExternalLink,
  Settings as SettingsIcon,
  Save,
  Loader2,
  Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useEventos } from '@/hooks/useEventos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { APP_VERSION, APP_BUILD_DATE, APP_NAME } from '@/lib/version';

export default function Configuracoes() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { getEventoById, refetch } = useEventos();
  const evento = eventoId ? getEventoById(eventoId) : null;

  // Estados editáveis
  const [intervaloAtualizacao, setIntervaloAtualizacao] = useState('30');
  const [alertaAmarelo, setAlertaAmarelo] = useState(15);
  const [alertaVermelho, setAlertaVermelho] = useState(25);
  const [painelPublicoHabilitado, setPainelPublicoHabilitado] = useState(true);
  const [painelLocalizadorHabilitado, setPainelLocalizadorHabilitado] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // URLs dos painéis
  const baseUrl = window.location.origin;
  const urlPainelPublico = `${baseUrl}/painel/${eventoId}`;
  const urlPainelLocalizador = `${baseUrl}/localizador/${eventoId}`;

  // Carregar dados do evento
  useEffect(() => {
    if (evento) {
      setPainelPublicoHabilitado(evento.visivel_publico === true);
      setPainelLocalizadorHabilitado((evento as any).habilitar_localizador === true);
      setAlertaAmarelo((evento as any).alerta_limiar_amarelo ?? 15);
      setAlertaVermelho((evento as any).alerta_limiar_vermelho ?? 25);
    }
    
    // Carregar intervalo do localStorage
    const stored = localStorage.getItem(`intervalo-atualizacao-${eventoId}`);
    if (stored) {
      setIntervaloAtualizacao(stored);
    }
  }, [evento, eventoId]);

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`URL do ${label} copiada!`);
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (!eventoId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('eventos')
        .update({
          visivel_publico: painelPublicoHabilitado,
          habilitar_localizador: painelLocalizadorHabilitado,
          alerta_limiar_amarelo: alertaAmarelo,
          alerta_limiar_vermelho: alertaVermelho,
        })
        .eq('id', eventoId);

      if (error) throw error;

      // Salvar intervalo no localStorage
      localStorage.setItem(`intervalo-atualizacao-${eventoId}`, intervaloAtualizacao);

      toast.success('Configurações salvas com sucesso!');
      setHasChanges(false);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setHasChanges(true);
  };

  return (
    <EventLayout>
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie configurações do evento e painéis externos
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações
          </Button>
        </div>

        {/* Conexão com Banco de Dados - Somente Leitura */}
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

        {/* Intervalo de Atualização - Editável */}
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
            <ToggleGroup 
              type="single" 
              value={intervaloAtualizacao}
              onValueChange={(value) => value && updateField(setIntervaloAtualizacao)(value)}
              className="justify-start"
            >
              <ToggleGroupItem value="15" aria-label="15 segundos">15s</ToggleGroupItem>
              <ToggleGroupItem value="30" aria-label="30 segundos">30s</ToggleGroupItem>
              <ToggleGroupItem value="60" aria-label="60 segundos">60s</ToggleGroupItem>
              <ToggleGroupItem value="120" aria-label="120 segundos">120s</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground mt-2">
              Além do intervalo, o sistema usa Realtime para atualizações instantâneas
            </p>
          </CardContent>
        </Card>

        {/* Configurações de Alertas - Editável */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configurações de Alertas</CardTitle>
                <CardDescription>Limiares para alertas de atraso baseados na média do motorista</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-status-alert/10 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">Alerta</p>
                <p className="text-xs text-muted-foreground">Ultrapassa a média em mais de X minutos</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={alertaAmarelo}
                  onChange={(e) => updateField(setAlertaAmarelo)(parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                  min={1}
                  max={60}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-critical/10 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">Crítico</p>
                <p className="text-xs text-muted-foreground">Ultrapassa a média em mais de X minutos</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={alertaVermelho}
                  onChange={(e) => updateField(setAlertaVermelho)(parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                  min={1}
                  max={120}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel Público (Shuttle) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Painel Público (Shuttle)</CardTitle>
                  <CardDescription>Passageiros podem visualizar rotas e horários</CardDescription>
                </div>
              </div>
              <Switch
                checked={painelPublicoHabilitado}
                onCheckedChange={updateField(setPainelPublicoHabilitado)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">URL do Painel</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={urlPainelPublico} 
                  readOnly 
                  className="flex-1 text-sm bg-muted/50"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopyUrl(urlPainelPublico, 'Painel Público')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleOpenUrl(urlPainelPublico)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button 
              variant="secondary" 
              className="w-full gap-2"
              onClick={() => navigate(`/evento/${eventoId}/painel-config`)}
            >
              <SettingsIcon className="w-4 h-4" />
              Configurar Painel Público
            </Button>
          </CardContent>
        </Card>

        {/* Painel Localizador (Frota) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Painel Localizador (Frota)</CardTitle>
                  <CardDescription>Exibe aba Localizador no app Cliente/Supervisor e no painel /localizador</CardDescription>
                </div>
              </div>
              <Switch
                checked={painelLocalizadorHabilitado}
                onCheckedChange={updateField(setPainelLocalizadorHabilitado)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">URL do Painel</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={urlPainelLocalizador} 
                  readOnly 
                  className="flex-1 text-sm bg-muted/50"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopyUrl(urlPainelLocalizador, 'Painel Localizador')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleOpenUrl(urlPainelLocalizador)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sobre o Sistema */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Sobre o Sistema</CardTitle>
                  <CardDescription>Informações da versão atual</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono">
                V{APP_VERSION}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {APP_NAME} - Centro de Controle Operacional
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Atualizado em {format(parseISO(APP_BUILD_DATE), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      </div>
    </EventLayout>
  );
}
