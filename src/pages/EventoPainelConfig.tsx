import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ExternalLink, Route } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageUploader } from '@/components/eventos/ImageUploader';
import { useEventos } from '@/hooks/useEventos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EventoPainelConfig() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById, refetch: refetchEventos } = useEventos();
  const evento = eventoId ? getEventoById(eventoId) : null;

  // Form state
  const [descricao, setDescricao] = useState('');
  const [imagemBanner, setImagemBanner] = useState<string | null>(null);
  const [imagemLogo, setImagemLogo] = useState<string | null>(null);
  const [visivelPublico, setVisivelPublico] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load evento data
  useEffect(() => {
    if (evento) {
      setDescricao((evento as any).descricao || '');
      setImagemBanner((evento as any).imagem_banner || null);
      setImagemLogo((evento as any).imagem_logo || null);
      setVisivelPublico(evento.visivel_publico ?? true);
    }
  }, [evento]);

  const handleSave = async () => {
    if (!eventoId) return;

    setSaving(true);
    const { error } = await supabase
      .from('eventos')
      .update({
        descricao: descricao.trim() || null,
        imagem_banner: imagemBanner,
        imagem_logo: imagemLogo,
        visivel_publico: visivelPublico,
      })
      .eq('id', eventoId);

    if (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Configurações salvas');
      setHasChanges(false);
      refetchEventos();
    }
    setSaving(false);
  };

  const updateField = (setter: (v: any) => void) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const publicUrl = `/painel/${eventoId}`;

  return (
    <EventLayout>
      <div className="p-8 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel Público</h1>
            <p className="text-muted-foreground">Configure como seu evento aparece para passageiros</p>
          </div>
          <Link to={publicUrl} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Painel
            </Button>
          </Link>
        </div>

        {/* Link para Rotas */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Rotas de Shuttle</p>
                  <p className="text-sm text-muted-foreground">Configure rotas exibidas no painel público</p>
                </div>
              </div>
              <Link to={`/evento/${eventoId}/rotas-shuttle`}>
                <Button variant="outline" size="sm">
                  Gerenciar Rotas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Visibilidade */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {visivelPublico ? (
                <Eye className="w-5 h-5 text-primary" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base">Visibilidade</CardTitle>
                <CardDescription>Mostrar evento no painel público</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Evento visível</Label>
                <p className="text-xs text-muted-foreground">Passageiros podem ver em /painel</p>
              </div>
              <Switch
                checked={visivelPublico}
                onCheckedChange={updateField(setVisivelPublico)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Descrição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
            <CardDescription>Texto exibido no painel para passageiros</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Transporte oficial do evento. Shuttles gratuitos para credenciados..."
              value={descricao}
              onChange={(e) => updateField(setDescricao)(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Imagens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagens</CardTitle>
            <CardDescription>Banner e logo do evento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Banner (imagem de capa)</Label>
              <ImageUploader
                value={imagemBanner}
                onChange={updateField(setImagemBanner)}
                eventoId={eventoId!}
                tipo="banner"
              />
            </div>
            <div>
              <Label className="mb-2 block">Logo (opcional)</Label>
              <ImageUploader
                value={imagemLogo}
                onChange={updateField(setImagemLogo)}
                eventoId={eventoId!}
                tipo="logo"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </div>
    </EventLayout>
  );
}
