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
import { Database } from '@/integrations/supabase/types';

// Use proper types from Supabase
type EventoRow = Database['public']['Tables']['eventos']['Row'];
type EventoUpdate = Database['public']['Tables']['eventos']['Update'];

// Partial evento type for compatibility with different sources
type PartialEvento = Pick<EventoRow, 'id' | 'nome_planilha' | 'data_criacao' | 'data_ultima_sync'> & 
  Partial<Omit<EventoRow, 'id' | 'nome_planilha' | 'data_criacao' | 'data_ultima_sync'>>;

interface EditEventoModalProps {
  evento: PartialEvento;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EditEventoModal({ evento, onSuccess, trigger }: EditEventoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // General
  const [nome, setNome] = useState(evento.nome_planilha);
  const [local, setLocal] = useState(evento.local || '');
  const [tipoOperacao, setTipoOperacao] = useState(evento.tipo_operacao || 'transfer');
  const [status, setStatus] = useState(evento.status || 'ativo');
  const [descricao, setDescricao] = useState(evento.descricao || '');

  // Dates
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('23:00');

  // Images
  const [imagemBanner, setImagemBanner] = useState<string | null>(evento.imagem_banner || null);
  const [imagemLogo, setImagemLogo] = useState<string | null>(evento.imagem_logo || null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Configurations
  const [habilitarMissoes, setHabilitarMissoes] = useState(evento.habilitar_missoes ?? false);
  const [visivelPublico, setVisivelPublico] = useState(evento.visivel_publico ?? true);

  useEffect(() => {
    // Parse dates from evento if they exist
    if (evento.data_inicio) {
      setDataInicio(new Date(evento.data_inicio + 'T12:00:00'));
    }
    if (evento.data_fim) {
      setDataFim(new Date(evento.data_fim + 'T12:00:00'));
    }
    if (evento.horario_virada_dia) {
      setHorarioVirada(evento.horario_virada_dia.substring(0, 5));
    }
    if ((evento as any).horario_inicio_evento) {
      setHorarioInicio((evento as any).horario_inicio_evento.substring(0, 5));
    }
    if ((evento as any).horario_fim_evento) {
      setHorarioFim((evento as any).horario_fim_evento.substring(0, 5));
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
    } catch (error) {
      const err = error as Error;
      console.error('Erro no upload:', err);
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
      const updateData: Record<string, any> = {
        nome_planilha: nome,
        local: local.trim() || null,
        tipo_operacao: tipoOperacao,
        status: status,
        descricao: descricao.trim() || null,
        imagem_banner: imagemBanner,
        imagem_logo: imagemLogo,
        habilitar_missoes: habilitarMissoes,
        visivel_publico: visivelPublico,
        horario_virada_dia: horarioVirada,
        horario_inicio_evento: horarioInicio,
        horario_fim_evento: horarioFim,
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
    } catch (error) {
      const err = error as Error;
      toast.error(`Erro ao atualizar: ${err.message}`);
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
            {/* Data e Horário de Início */}
            <div className="space-y-2">
              <Label>Início do Evento</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
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
                      {dataInicio ? format(dataInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
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
                <Input
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>

            {/* Data e Horário de Término */}
            <div className="space-y-2">
              <Label>Término do Evento</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
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
                      {dataFim ? format(dataFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
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
                <Input
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>

            {/* Finalização Diária */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label className="font-medium">Finalização Diária (Virada do Dia)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Neste horário, o sistema finaliza automaticamente o dia operacional:
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Viagens abertas são encerradas</li>
                <li>Missões pendentes são canceladas</li>
                <li>Motoristas recebem checkout automático</li>
                <li>Um novo dia operacional se inicia</li>
              </ul>
              <Input
                type="time"
                value={horarioVirada}
                onChange={(e) => setHorarioVirada(e.target.value)}
                className="w-28"
              />
              <p className="text-xs text-muted-foreground">
                Atividades após meia-noite e antes deste horário contam como o dia anterior.
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
            <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <Label className="font-medium text-purple-900">Módulo de Missões</Label>
                    <p className="text-xs text-purple-700/80 mt-1">
                      Permite designar tarefas para motoristas.
                      Motoristas precisam fazer check-in/vistoria diária.
                      Evento aparece no Localizador.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={habilitarMissoes}
                  onCheckedChange={setHabilitarMissoes}
                />
              </div>
            </div>
            
            <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <Label className="font-medium text-green-900">Visível no Painel Público</Label>
                    <p className="text-xs text-green-700/80 mt-1">
                      Exibe rotas Shuttle para passageiros em /painel.
                      Não afeta operações Transfer.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={visivelPublico}
                  onCheckedChange={setVisivelPublico}
                />
              </div>
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
