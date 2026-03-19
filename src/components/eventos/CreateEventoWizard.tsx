import { useState, useRef } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, X, Image as ImageIcon, Clock, UserCheck, Eye, Car, Bus, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateEventoWizardProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateEventoWizard({ onSuccess, trigger }: CreateEventoWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data - Step 1
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [tiposViagem, setTiposViagem] = useState<string[]>(['missao']);
  
  // Step 2 - Dates
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('23:00');
  
  // Step 3 - Images
  const [imagemBanner, setImagemBanner] = useState<string | null>(null);
  const [imagemLogo, setImagemLogo] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Step 4 - Configurations
  const [visivelPublico, setVisivelPublico] = useState(true);
  
  // Step 5 - Description
  const [descricao, setDescricao] = useState('');

  const resetForm = () => {
    setStep(1);
    setNome('');
    setLocal('');
    setTiposViagem(['missao']);
    setDataInicio(undefined);
    setDataFim(undefined);
    setHorarioVirada('04:00');
    setHorarioInicio('08:00');
    setHorarioFim('23:00');
    setDescricao('');
    setImagemBanner(null);
    setImagemLogo(null);
    setVisivelPublico(true);
    setVisivelPublico(true);
  };

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
      const fileName = `temp/${type}-${Date.now()}.${ext}`;

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

  const handleCreate = async () => {
    if (!nome || !dataInicio || !dataFim || tiposViagem.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Derive legacy fields for compatibility
      const habilitarMissoes = tiposViagem.includes('missao');
      const temShuttle = tiposViagem.includes('shuttle');
      const tipoOperacao = temShuttle ? 'shuttle' : 'shuttle';

      const { error } = await supabase.from('eventos').insert({
        nome_planilha: nome,
        local: local.trim() || null,
        tipo_operacao: tipoOperacao,
        tipos_viagem_habilitados: tiposViagem,
        data_inicio: format(dataInicio, 'yyyy-MM-dd'),
        data_fim: format(dataFim, 'yyyy-MM-dd'),
        horario_virada_dia: horarioVirada,
        horario_inicio_evento: horarioInicio,
        horario_fim_evento: horarioFim,
        descricao: descricao.trim() || null,
        imagem_banner: imagemBanner,
        imagem_logo: imagemLogo,
        habilitar_missoes: habilitarMissoes,
        visivel_publico: visivelPublico,
        status: 'ativo',
        total_viagens: 0,
      } as any);

      if (error) throw error;

      toast.success('Evento criado com sucesso!');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Erro ao criar evento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return nome.trim().length > 0 && tiposViagem.length > 0;
    if (step === 2) return dataInicio && dataFim && dataFim >= dataInicio;
    return true;
  };

  const totalSteps = 6;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || <Button>Criar Evento</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Novo Evento - Informações Básicas'}
            {step === 2 && 'Novo Evento - Período'}
            {step === 3 && 'Novo Evento - Imagens'}
            {step === 4 && 'Novo Evento - Configurações'}
            {step === 5 && 'Novo Evento - Descrição'}
            {step === 6 && 'Novo Evento - Confirmar'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Evento *</Label>
              <Input
                id="nome"
                placeholder="Ex: Rock in Rio 2025"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local do Evento</Label>
              <Input
                id="local"
                placeholder="Ex: Parque Olímpico, Rio de Janeiro - RJ"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipos de Viagem Habilitados *</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione pelo menos 1 tipo de viagem para este evento.</p>
              <div className="space-y-2">
                {[
                  { value: 'missao', label: 'Missão', icon: <Target className="h-4 w-4 text-purple-600" />, desc: 'Tarefas designadas pelo CCO. Motorista aceita, inicia e conclui.', border: 'purple' },
                  { value: 'shuttle', label: 'Shuttle (Circular)', icon: <Bus className="h-4 w-4 text-emerald-600" />, desc: 'Rotas fixas com grade de horários. Ideal para alto volume.', border: 'emerald' },
                ].map(tipo => {
                  const checked = tiposViagem.includes(tipo.value);
                  return (
                    <label
                      key={tipo.value}
                      className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                        checked ? `border-${tipo.border}-500 bg-${tipo.border}-50` : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          setTiposViagem(prev =>
                            c ? [...prev, tipo.value] : prev.filter(t => t !== tipo.value)
                          );
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span className="font-medium flex items-center gap-2">
                          {tipo.icon}
                          {tipo.label}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">{tipo.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Dates and Operational Day */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Início */}
            <div className="space-y-2">
              <Label>Início do Evento *</Label>
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

            {/* Término */}
            <div className="space-y-2">
              <Label>Término do Evento *</Label>
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

            {dataInicio && dataFim && (
              <p className="text-sm text-muted-foreground text-center">
                Duração: {Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
              </p>
            )}

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Finalização Diária (Virada do Dia)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Neste horário, o sistema finaliza o dia: viagens encerradas, missões canceladas, checkout automático dos motoristas.
              </p>
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
          </div>
        )}

        {/* Step 3: Images */}
        {step === 3 && (
          <div className="space-y-4">
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
            
            {/* Banner */}
            <div className="space-y-2">
              <Label>Imagem de Capa (Banner)</Label>
              <p className="text-xs text-muted-foreground">
                Exibida como banner do evento no painel público
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
              <Label>Logo do Evento (Opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Logomarca para identificação do evento
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

            <p className="text-xs text-muted-foreground">
              💡 As imagens são opcionais. Você pode adicionar ou alterar depois.
            </p>
          </div>
        )}

        {/* Step 4: Configurations */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <Label className="font-medium text-green-900">Visível no Painel Público</Label>
                    <p className="text-xs text-green-700/80 mt-1">
                      Quando ativo (apenas para operações Shuttle):
                    </p>
                    <ul className="text-xs text-green-700/80 mt-1 space-y-0.5 list-disc list-inside">
                      <li>Passageiros podem ver rotas de transporte</li>
                      <li>Grade de horários visível em /painel</li>
                    </ul>
                  </div>
                </div>
                <Switch
                  checked={visivelPublico}
                  onCheckedChange={setVisivelPublico}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Description */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Evento</Label>
              <p className="text-xs text-muted-foreground">
                Esta descrição será exibida no painel público para passageiros
              </p>
              <Textarea
                id="descricao"
                placeholder="Ex: Transporte oficial do evento. Shuttles gratuitos para credenciados entre hotéis e local do evento."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Você pode adicionar rotas de shuttle após criar o evento, na aba "Painel Público"
            </p>
          </div>
        )}

        {/* Step 6: Confirm */}
        {step === 6 && (
          <div className="space-y-4">
            {imagemBanner && (
              <div className="aspect-[3/1] rounded-lg overflow-hidden border bg-muted">
                <img
                  src={imagemBanner}
                  alt="Banner do evento"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-medium">{nome}</span>
              </div>
              {local && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Local:</span>
                  <span className="font-medium">{local}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipos de Viagem:</span>
                <div className="flex gap-1">
                  {tiposViagem.map(t => (
                    <Badge key={t} variant="default" className="capitalize">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Painel Público:</span>
                <Badge variant={visivelPublico ? 'default' : 'secondary'}>
                  {visivelPublico ? 'Visível' : 'Oculto'}
                </Badge>
              </div>
              
              {descricao && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Descrição:</span>
                  <p className="text-sm mt-1">{descricao}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              {step === 5 ? 'Revisar' : 'Próximo'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Evento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
