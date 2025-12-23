import { useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

  // Form data
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState<'transfer' | 'shuttle' | 'ambos'>('transfer');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [descricao, setDescricao] = useState('');

  const resetForm = () => {
    setStep(1);
    setNome('');
    setLocal('');
    setTipoOperacao('transfer');
    setDataInicio(undefined);
    setDataFim(undefined);
    setDescricao('');
  };

  const handleCreate = async () => {
    if (!nome || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('eventos').insert({
        nome_planilha: nome,
        local: local.trim() || null,
        tipo_operacao: tipoOperacao === 'ambos' ? 'transfer' : tipoOperacao,
        data_inicio: format(dataInicio, 'yyyy-MM-dd'),
        data_fim: format(dataFim, 'yyyy-MM-dd'),
        descricao: descricao.trim() || null,
        status: 'ativo',
        total_viagens: 0,
        visivel_publico: true,
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
    if (step === 1) return nome.trim().length > 0;
    if (step === 2) return dataInicio && dataFim && dataFim >= dataInicio;
    return true;
  };

  const totalSteps = 4;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || <Button>Criar Evento</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Novo Evento - Informações Básicas'}
            {step === 2 && 'Novo Evento - Datas'}
            {step === 3 && 'Novo Evento - Descrição'}
            {step === 4 && 'Novo Evento - Confirmar'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
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
              <Label>Tipo de Operação *</Label>
              <RadioGroup value={tipoOperacao} onValueChange={(v) => setTipoOperacao(v as any)}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="transfer" id="transfer" />
                  <Label htmlFor="transfer" className="cursor-pointer flex-1">
                    <span className="font-medium">Transfer</span>
                    <p className="text-xs text-muted-foreground">Viagens ponto a ponto</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="shuttle" id="shuttle" />
                  <Label htmlFor="shuttle" className="cursor-pointer flex-1">
                    <span className="font-medium">Shuttle</span>
                    <p className="text-xs text-muted-foreground">Rotas circulares contínuas</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="ambos" id="ambos" />
                  <Label htmlFor="ambos" className="cursor-pointer flex-1">
                    <span className="font-medium">Ambos</span>
                    <p className="text-xs text-muted-foreground">Transfer e Shuttle</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 2: Dates */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
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
                <Label>Data de Término *</Label>
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

            {dataInicio && dataFim && (
              <p className="text-sm text-muted-foreground text-center">
                Duração: {Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
              </p>
            )}
          </div>
        )}

        {/* Step 3: Description */}
        {step === 3 && (
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
              💡 Você pode adicionar imagens e rotas de shuttle após criar o evento, na aba "Painel Público"
            </p>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4">
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
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium capitalize">{tipoOperacao}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium">
                  {dataInicio && format(dataInicio, 'dd/MM/yyyy')} - {dataFim && format(dataFim, 'dd/MM/yyyy')}
                </span>
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
              {step === 3 ? 'Revisar' : 'Próximo'}
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
