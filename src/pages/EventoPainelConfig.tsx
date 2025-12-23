import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Plus, Pencil, Trash2, Route, ExternalLink } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ImageUploader } from '@/components/eventos/ImageUploader';
import { RotaShuttleModal } from '@/components/eventos/RotaShuttleModal';
import { useEventos } from '@/hooks/useEventos';
import { useRotasShuttle, RotaShuttle, RotaShuttleInput } from '@/hooks/useRotasShuttle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EventoPainelConfig() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { getEventoById, refetch: refetchEventos } = useEventos();
  const evento = eventoId ? getEventoById(eventoId) : null;
  const { rotas, loading: loadingRotas, createRota, updateRota, deleteRota } = useRotasShuttle(eventoId);

  // Form state
  const [descricao, setDescricao] = useState('');
  const [imagemBanner, setImagemBanner] = useState<string | null>(null);
  const [imagemLogo, setImagemLogo] = useState<string | null>(null);
  const [visivelPublico, setVisivelPublico] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Rota modal state
  const [rotaModalOpen, setRotaModalOpen] = useState(false);
  const [editingRota, setEditingRota] = useState<RotaShuttle | null>(null);
  const [deletingRota, setDeletingRota] = useState<RotaShuttle | null>(null);

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

  const handleRotaSave = async (data: RotaShuttleInput) => {
    if (editingRota) {
      await updateRota(editingRota.id, data);
    } else {
      await createRota(data);
    }
    setEditingRota(null);
  };

  const handleDeleteRota = async () => {
    if (deletingRota) {
      await deleteRota(deletingRota.id);
      setDeletingRota(null);
    }
  };

  const openEditRota = (rota: RotaShuttle) => {
    setEditingRota(rota);
    setRotaModalOpen(true);
  };

  const openNewRota = () => {
    setEditingRota(null);
    setRotaModalOpen(true);
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

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
            <TabsTrigger value="rotas">Rotas de Shuttle</TabsTrigger>
          </TabsList>

          {/* Tab: Informações Gerais */}
          <TabsContent value="geral" className="space-y-6">
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
          </TabsContent>

          {/* Tab: Rotas de Shuttle */}
          <TabsContent value="rotas" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      Rotas de Shuttle
                    </CardTitle>
                    <CardDescription>Defina rotas com frequência e horários para o painel público</CardDescription>
                  </div>
                  <Button onClick={openNewRota}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Rota
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRotas ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : rotas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma rota cadastrada</p>
                    <p className="text-sm">Adicione rotas de shuttle para exibir no painel público</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rotas.map((rota) => (
                      <div
                        key={rota.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{rota.nome}</span>
                            {!rota.ativo && (
                              <Badge variant="secondary" className="text-xs">Inativa</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rota.origem} → {rota.destino}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {rota.frequencia_minutos && `A cada ${rota.frequencia_minutos} min`}
                            {rota.horario_inicio && rota.horario_fim && ` • ${rota.horario_inicio.slice(0,5)} às ${rota.horario_fim.slice(0,5)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditRota(rota)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingRota(rota)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rota Modal */}
      <RotaShuttleModal
        open={rotaModalOpen}
        onOpenChange={setRotaModalOpen}
        rota={editingRota}
        onSave={handleRotaSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRota} onOpenChange={() => setDeletingRota(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a rota "{deletingRota?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRota} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EventLayout>
  );
}
