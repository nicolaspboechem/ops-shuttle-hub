import { useState, useEffect, useRef } from 'react';
import { CalendarIcon, Loader2, Pencil, X, Image as ImageIcon, Clock, UserCheck, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Evento } from '@/lib/types/viagem';

interface EditEventoModalProps {
  evento: Evento;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EditEventoModal({ evento, onSuccess, trigger }: EditEventoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // General
  const [nome, setNome] = useState(evento.nome_planilha);
  const [local, setLocal] = useState((evento as any).local || '');
  const [tipoOperacao, setTipoOperacao] = useState(evento.tipo_operacao || 'transfer');
  const [status, setStatus] = useState(evento.status || 'ativo');
  const [descricao, setDescricao] = useState((evento as any).descricao || '');

  // Dates
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [horarioVirada, setHorarioVirada] = useState('04:00');

  // Images
  const [imagemBanner, setImagemBanner] = useState<string | null>((evento as any).imagem_banner || null);
  const [imagemLogo, setImagemLogo] = useState<string | null>((evento as any).imagem_logo || null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Configurations
  const [habilitarCheckin, setHabilitarCheckin] = useState((evento as any).habilitar_checkin ?? true);
  const [visivelPublico, setVisivelPublico] = useState((evento as any).visivel_publico ?? true);

  useEffect(() => {
    // Parse dates from evento if they exist
    if ((evento as any).data_inicio) {
      setDataInicio(new Date((evento as any).data_inicio));
    }
    if ((evento as any).data_fim) {
      setDataFim(new Date((evento as any).data_fim));
    }
    if ((evento as any).horario_virada_dia) {
      setHorarioVirada((evento as any).horario_virada_dia.substring(0, 5));
    }
  }, [evento]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'banner' | 'logo'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${evento.id}/${type}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('eventos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('eventos')
        .getPublicUrl(fileName);

      if (type === 'banner') {
        setImagemBanner(publicUrl);
      } else {
        setImagemLogo(publicUrl);
      }
      toast.success('Imagem enviada com sucesso');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('Nome do evento é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        nome_planilha: nome,
        local: local.trim() || null,
        tipo_operacao: tipoOperacao,
        status: status,
        descricao: descricao.trim() || null,
        imagem_banner: imagemBanner,
        imagem_logo: imagemLogo,
        habilitar_checkin: habilitarCheckin,
        visivel_publico: visivelPublico,
        horario_virada_dia: horarioVirada,
      };

      if (dataInicio) {
        updateData.data_inicio = format(dataInicio, 'yyyy-MM-dd');
      }
      if (dataFim) {
        updateData.data_fim = format(dataFim, 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('eventos')
        .update(updateData)
        .eq('id', evento.id);

      if (error) throw error;

      toast.success('Evento atualizado com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Erro ao atualizar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, 'banner')}
          className="hidden"
        />
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, 'logo')}
          className="hidden"
        />

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="periodo">Período</TabsTrigger>
            <TabsTrigger value="imagens">Imagens</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          {/* Tab: Geral */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Evento *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
                placeholder="Ex: Parque Olímpico, Rio de Janeiro - RJ"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <Select value={tipoOperacao || 'transfer'} onValueChange={setTipoOperacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="shuttle">Shuttle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status || 'ativo'} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="processando">Processando</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descrição exibida para passageiros no painel público"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </TabsContent>

          {/* Tab: Período */}
          <TabsContent value="periodo" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dataInicio && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dataFim && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      disabled={(date) => dataInicio ? date < dataInicio : false}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label className="font-medium">Horário de Virada do Dia</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Atividades após meia-noite e antes deste horário contam como o dia anterior.
              </p>
              <Input
                type="time"
                value={horarioVirada}
                onChange={(e) => setHorarioVirada(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Ex: Se 04:00, uma viagem às 02:00 do dia 14 será registrada como dia 13.
              </p>
            </div>
          </TabsContent>

          {/* Tab: Imagens */}
          <TabsContent value="imagens" className="space-y-4 mt-4">
            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner do Evento</Label>
              <p className="text-xs text-muted-foreground">
                Exibido como capa no painel público
              </p>

              {imagemBanner ? (
                <div className="relative aspect-[3/1] rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={imagemBanner}
                    alt="Banner do evento"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setImagemBanner(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex flex-col items-center justify-center w-full aspect-[3/1] rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 hover:bg-muted hover:border-muted-foreground/50 transition-colors cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Clique para enviar banner
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo do Evento</Label>
              <p className="text-xs text-muted-foreground">
                Logomarca para identificação
              </p>

              {imagemLogo ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={imagemLogo}
                    alt="Logo do evento"
                    className="w-full h-full object-contain"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setImagemLogo(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 hover:bg-muted hover:border-muted-foreground/50 transition-colors cursor-pointer"
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
            </div>
          </TabsContent>

          {/* Tab: Configurações */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <Label className="font-medium">Controle de Presença</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Motoristas precisam fazer check-in/check-out diário
                  </p>
                </div>
              </div>
              <Switch
                checked={habilitarCheckin}
                onCheckedChange={setHabilitarCheckin}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <Label className="font-medium">Visível no Painel Público</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Passageiros podem ver informações e rotas
                  </p>
                </div>
              </div>
              <Switch
                checked={visivelPublico}
                onCheckedChange={setVisivelPublico}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
