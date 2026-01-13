import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Veiculo } from '@/hooks/useCadastros';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  Car, 
  Fuel, 
  Camera, 
  ClipboardCheck,
  Bus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InspecaoChecklist, getDefaultAreas, type AreaInspecao } from '@/components/veiculos/InspecaoChecklist';
import { CombustivelGauge } from '@/components/veiculos/CombustivelGauge';
import { MultipleImageUploader } from '@/components/veiculos/MultipleImageUploader';

interface VistoriaVeiculoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  veiculoExistente?: Veiculo | null;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Dados', icon: Car },
  { id: 2, title: 'Inspeção', icon: Camera },
  { id: 3, title: 'Combustível', icon: Fuel },
  { id: 4, title: 'Confirmar', icon: ClipboardCheck },
];

export function VistoriaVeiculoWizard({
  open,
  onOpenChange,
  eventoId,
  veiculoExistente,
  onComplete
}: VistoriaVeiculoWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const tempId = useMemo(() => crypto.randomUUID(), []);
  const isEditing = !!veiculoExistente;

  // Step 1 - Dados Básicos
  const [placa, setPlaca] = useState('');
  const [nome, setNome] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState('Van');
  const [capacidade, setCapacidade] = useState('15');
  const [fornecedor, setFornecedor] = useState('');

  // Step 2 - Inspeção Visual
  const [areasInspecao, setAreasInspecao] = useState<AreaInspecao[]>(getDefaultAreas());
  const [fotosGerais, setFotosGerais] = useState<string[]>([]);

  // Step 3 - Combustível e KM
  const [nivelCombustivel, setNivelCombustivel] = useState('1/2');
  const [kmInicial, setKmInicial] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Step 4 - Confirmação
  const [statusFinal, setStatusFinal] = useState<'liberado' | 'pendente'>('liberado');

  // Preencher dados se for edição
  useEffect(() => {
    if (veiculoExistente && open) {
      setPlaca(veiculoExistente.placa);
      setNome(veiculoExistente.nome || '');
      setTipoVeiculo(veiculoExistente.tipo_veiculo);
      setCapacidade(String(veiculoExistente.capacidade || 15));
      setFornecedor(veiculoExistente.fornecedor || '');
      setNivelCombustivel(veiculoExistente.nivel_combustivel || '1/2');
      setKmInicial(String(veiculoExistente.km_inicial || ''));
      setObservacoesGerais(veiculoExistente.observacoes_gerais || '');
      
      // Carregar dados de inspeção anteriores se existirem
      if (veiculoExistente.inspecao_dados) {
        const dados = veiculoExistente.inspecao_dados as any;
        if (dados.areas) {
          setAreasInspecao(dados.areas.map((a: any) => ({
            ...a,
            icon: getDefaultAreas().find(d => d.id === a.id)?.icon
          })));
        }
        if (dados.fotosGerais) {
          setFotosGerais(dados.fotosGerais);
        }
      }
      
      // Começar no passo 2 para re-inspeção
      setCurrentStep(2);
    }
  }, [veiculoExistente, open]);

  const possuiAvarias = areasInspecao.some(a => a.possuiAvaria);
  const totalFotos = fotosGerais.length + areasInspecao.reduce((acc, a) => acc + a.fotos.length, 0);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return placa.trim().length >= 7;
      case 2:
        return true;
      case 3:
        return true; // KM opcional na re-inspeção
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const inspecaoDados = {
        areas: areasInspecao.map(a => ({
          id: a.id,
          nome: a.nome,
          possuiAvaria: a.possuiAvaria,
          descricao: a.descricao,
          fotos: a.fotos
        })),
        fotosGerais,
        observacoes: observacoesGerais
      };

      if (isEditing && veiculoExistente) {
        // Atualizar veículo existente
        const { error } = await supabase
          .from('veiculos')
          .update({
            nivel_combustivel: nivelCombustivel,
            possui_avarias: possuiAvarias,
            inspecao_dados: inspecaoDados,
            inspecao_data: new Date().toISOString(),
            inspecao_por: user?.id || null,
            observacoes_gerais: observacoesGerais.trim() || null,
            status: statusFinal,
            liberado_em: statusFinal === 'liberado' ? new Date().toISOString() : null,
            liberado_por: statusFinal === 'liberado' ? user?.id : null,
            atualizado_por: user?.id || null,
            ...(kmInicial && { km_inicial: parseInt(kmInicial) })
          })
          .eq('id', veiculoExistente.id);

        if (error) throw error;

        toast.success(`Veículo ${statusFinal === 'liberado' ? 'liberado' : 'pendente'}!`);
      } else {
        // Criar novo veículo
        const { data: veiculo, error: veiculoError } = await supabase
          .from('veiculos')
          .insert([{
            evento_id: eventoId,
            placa: placa.trim().toUpperCase(),
            nome: nome.trim() || null,
            tipo_veiculo: tipoVeiculo,
            capacidade: capacidade ? parseInt(capacidade) : 15,
            fornecedor: fornecedor.trim() || null,
            km_inicial: kmInicial ? parseInt(kmInicial) : null,
            km_inicial_registrado_por: user?.id || null,
            km_inicial_data: new Date().toISOString(),
            nivel_combustivel: nivelCombustivel,
            possui_avarias: possuiAvarias,
            inspecao_dados: inspecaoDados,
            inspecao_data: new Date().toISOString(),
            inspecao_por: user?.id || null,
            observacoes_gerais: observacoesGerais.trim() || null,
            status: statusFinal,
            liberado_em: statusFinal === 'liberado' ? new Date().toISOString() : null,
            liberado_por: statusFinal === 'liberado' ? user?.id : null,
            ativo: true,
            criado_por: user?.id || null,
            atualizado_por: user?.id || null
          }])
          .select()
          .single();

        if (veiculoError) {
          if (veiculoError.code === '23505') {
            toast.error('Já existe um veículo com esta placa');
          } else {
            toast.error('Erro ao criar veículo');
          }
          return;
        }

        // Salvar fotos
        const fotosToInsert: any[] = [];
        fotosGerais.forEach((url, idx) => {
          fotosToInsert.push({
            veiculo_id: veiculo.id,
            url,
            tipo: 'geral',
            ordem: idx,
            criado_por: user?.id || null
          });
        });

        areasInspecao.forEach(area => {
          area.fotos.forEach((url, idx) => {
            fotosToInsert.push({
              veiculo_id: veiculo.id,
              url,
              tipo: area.possuiAvaria ? 'avaria' : 'inspecao',
              area_veiculo: area.id,
              descricao: area.possuiAvaria ? area.descricao : null,
              ordem: idx,
              criado_por: user?.id || null
            });
          });
        });

        if (fotosToInsert.length > 0) {
          await supabase.from('veiculo_fotos').insert(fotosToInsert);
        }

        toast.success(`Veículo ${statusFinal === 'liberado' ? 'liberado' : 'cadastrado'}!`);
      }

      onComplete();
      handleClose();
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao salvar veículo');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentStep(1);
    setPlaca('');
    setNome('');
    setTipoVeiculo('Van');
    setCapacidade('15');
    setFornecedor('');
    setAreasInspecao(getDefaultAreas());
    setFotosGerais([]);
    setNivelCombustivel('1/2');
    setKmInicial('');
    setObservacoesGerais('');
    setStatusFinal('liberado');
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[95vh] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <SheetTitle className="flex-1">
              {isEditing ? 'Re-vistoria de Veículo' : 'Nova Vistoria'}
            </SheetTitle>
          </div>
          
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                    currentStep >= step.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "w-6 h-0.5 mx-1",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step 1: Dados Básicos */}
          {currentStep === 1 && (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa *</Label>
                  <Input
                    id="placa"
                    value={placa}
                    onChange={e => setPlaca(e.target.value)}
                    placeholder="ABC1234"
                    className="uppercase text-lg h-12"
                    maxLength={7}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome/Apelido</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Sprinter 01"
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={tipoVeiculo} onValueChange={setTipoVeiculo}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Van">Van</SelectItem>
                        <SelectItem value="Ônibus">Ônibus</SelectItem>
                        <SelectItem value="Sedan">Sedan</SelectItem>
                        <SelectItem value="SUV">SUV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacidade">Capacidade</Label>
                    <Input
                      id="capacidade"
                      type="number"
                      value={capacidade}
                      onChange={e => setCapacidade(e.target.value)}
                      placeholder="15"
                      className="h-12"
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Fornecedor</Label>
                  <Input
                    id="fornecedor"
                    value={fornecedor}
                    onChange={e => setFornecedor(e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="h-12"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Inspeção Visual */}
          {currentStep === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Marque as áreas com avarias e tire fotos para documentar.
              </p>
              
              <InspecaoChecklist
                eventoId={eventoId}
                tempId={tempId}
                areas={areasInspecao}
                onChange={setAreasInspecao}
              />

              <div className="space-y-2 pt-4 border-t">
                <Label>Fotos gerais do veículo</Label>
                <MultipleImageUploader
                  eventoId={eventoId}
                  tempId={tempId}
                  tipo="geral"
                  maxFiles={10}
                  value={fotosGerais}
                  onChange={setFotosGerais}
                />
              </div>
            </>
          )}

          {/* Step 3: Combustível e KM */}
          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nível de Combustível</Label>
                  <CombustivelGauge 
                    value={nivelCombustivel} 
                    onChange={setNivelCombustivel} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmInicial">
                    Quilometragem {isEditing ? '(atualizar)' : 'Inicial'}
                  </Label>
                  <Input
                    id="kmInicial"
                    type="number"
                    value={kmInicial}
                    onChange={e => setKmInicial(e.target.value)}
                    placeholder="0"
                    className="h-12 text-lg"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações Gerais</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoesGerais}
                    onChange={e => setObservacoesGerais(e.target.value)}
                    placeholder="Observações sobre o estado geral..."
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Confirmação */}
          {currentStep === 4 && (
            <>
              {/* Resumo */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  {tipoVeiculo === 'Ônibus' || tipoVeiculo === 'Van' ? (
                    <Bus className="h-5 w-5" />
                  ) : (
                    <Car className="h-5 w-5" />
                  )}
                  {placa.toUpperCase()}
                  {nome && <span className="text-muted-foreground font-normal">({nome})</span>}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium">{tipoVeiculo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacidade:</span>
                    <span className="ml-2 font-medium">{capacidade} lugares</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Combustível:</span>
                    <span className="ml-2 font-medium">{nivelCombustivel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fotos:</span>
                    <span className="ml-2 font-medium">{totalFotos}</span>
                  </div>
                </div>
              </div>

              {/* Avarias */}
              {possuiAvarias && (
                <div className="p-4 bg-destructive/10 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <h4 className="font-semibold">Avarias Encontradas</h4>
                  </div>
                  <ul className="text-sm space-y-1">
                    {areasInspecao.filter(a => a.possuiAvaria).map(area => (
                      <li key={area.id} className="flex items-start gap-2">
                        <span className="font-medium">{area.nome}:</span>
                        <span className="text-muted-foreground">
                          {area.descricao || 'Sem descrição'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ação final */}
              <div className="space-y-3 pt-4 border-t">
                <Label>Decisão Final</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatusFinal('liberado')}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      statusFinal === 'liberado'
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <Check className={cn(
                      "h-8 w-8 mx-auto mb-2",
                      statusFinal === 'liberado' ? "text-emerald-600" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-semibold",
                      statusFinal === 'liberado' ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      Liberar
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFinal('pendente')}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      statusFinal === 'pendente'
                        ? "border-destructive bg-destructive/10"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <AlertTriangle className={cn(
                      "h-8 w-8 mx-auto mb-2",
                      statusFinal === 'pendente' ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-semibold",
                      statusFinal === 'pendente' ? "text-destructive" : "text-muted-foreground"
                    )}>
                      Pendente
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background">
          {currentStep < 4 ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()} 
              className="w-full h-12 text-base"
            >
              Próximo
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className={cn(
                "w-full h-12 text-base",
                statusFinal === 'liberado' 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "bg-destructive hover:bg-destructive/90"
              )}
            >
              {saving && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              {statusFinal === 'liberado' ? 'Liberar Veículo' : 'Registrar como Pendente'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
