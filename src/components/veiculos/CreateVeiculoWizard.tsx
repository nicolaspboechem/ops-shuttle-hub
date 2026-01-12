import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight, Check, AlertTriangle, Car, Fuel, Camera, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InspecaoChecklist, getDefaultAreas, type AreaInspecao } from './InspecaoChecklist';
import { CombustivelGauge } from './CombustivelGauge';
import { MultipleImageUploader } from './MultipleImageUploader';

interface CreateVeiculoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated: () => void;
}

const STEPS = [
  { id: 1, title: 'Dados Básicos', icon: Car },
  { id: 2, title: 'Inspeção Visual', icon: Camera },
  { id: 3, title: 'Combustível e KM', icon: Fuel },
  { id: 4, title: 'Confirmação', icon: ClipboardCheck },
];

export function CreateVeiculoWizard({
  open,
  onOpenChange,
  eventoId,
  onCreated
}: CreateVeiculoWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Gerar ID temporário para uploads
  const tempId = useMemo(() => crypto.randomUUID(), []);

  // Step 1 - Dados Básicos
  const [placa, setPlaca] = useState('');
  const [nome, setNome] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState('Van');
  const [capacidade, setCapacidade] = useState('15');
  const [fornecedor, setFornecedor] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');

  // Step 2 - Inspeção Visual
  const [areasInspecao, setAreasInspecao] = useState<AreaInspecao[]>(getDefaultAreas());
  const [fotosGerais, setFotosGerais] = useState<string[]>([]);

  // Step 3 - Combustível e KM
  const [nivelCombustivel, setNivelCombustivel] = useState('1/2');
  const [kmInicial, setKmInicial] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Step 4 - Confirmação
  const [statusFinal, setStatusFinal] = useState<'liberado' | 'pendente'>('liberado');

  const possuiAvarias = areasInspecao.some(a => a.possuiAvaria);
  const totalFotos = fotosGerais.length + areasInspecao.reduce((acc, a) => acc + a.fotos.length, 0);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return placa.trim().length >= 7;
      case 2:
        return true; // Inspeção é opcional
      case 3:
        return kmInicial.trim().length > 0;
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
    if (!placa.trim()) {
      toast.error('Informe a placa do veículo');
      return;
    }

    setSaving(true);

    try {
      // Montar dados de inspeção
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

      // Criar veículo
      const { data: veiculo, error: veiculoError } = await supabase
        .from('veiculos')
        .insert([{
          evento_id: eventoId,
          placa: placa.trim().toUpperCase(),
          nome: nome.trim() || null,
          tipo_veiculo: tipoVeiculo,
          capacidade: capacidade ? parseInt(capacidade) : 15,
          fornecedor: fornecedor.trim() || null,
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
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
        console.error('Erro ao criar veículo:', veiculoError);
        if (veiculoError.code === '23505') {
          toast.error('Já existe um veículo com esta placa');
        } else {
          toast.error('Erro ao criar veículo');
        }
        return;
      }

      // Salvar fotos na tabela veiculo_fotos
      const fotosToInsert: any[] = [];
      
      // Fotos gerais
      fotosGerais.forEach((url, idx) => {
        fotosToInsert.push({
          veiculo_id: veiculo.id,
          url,
          tipo: 'geral',
          ordem: idx,
          criado_por: user?.id || null
        });
      });

      // Fotos das áreas
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
        const { error: fotosError } = await supabase
          .from('veiculo_fotos')
          .insert(fotosToInsert);

        if (fotosError) {
          console.error('Erro ao salvar fotos:', fotosError);
          // Não falha se fotos derem erro
        }
      }

      toast.success(`Veículo ${statusFinal === 'liberado' ? 'liberado' : 'cadastrado como pendente'}!`);
      onCreated();
      handleClose();
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar veículo');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setCurrentStep(1);
    setPlaca('');
    setNome('');
    setTipoVeiculo('Van');
    setCapacidade('15');
    setFornecedor('');
    setMarca('');
    setModelo('');
    setAreasInspecao(getDefaultAreas());
    setFotosGerais([]);
    setNivelCombustivel('1/2');
    setKmInicial('');
    setObservacoesGerais('');
    setStatusFinal('liberado');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Cadastrar Veículo
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-3 border-b">
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
                  "w-8 h-0.5 mx-1",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Step 1: Dados Básicos */}
          {currentStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa *</Label>
                  <Input
                    id="placa"
                    value={placa}
                    onChange={e => setPlaca(e.target.value)}
                    placeholder="ABC1234"
                    className="uppercase"
                    maxLength={7}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome/Apelido</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Sprinter 01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo de Veículo *</Label>
                  <Select value={tipoVeiculo} onValueChange={setTipoVeiculo}>
                    <SelectTrigger>
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
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={marca}
                    onChange={e => setMarca(e.target.value)}
                    placeholder="Mercedes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    placeholder="Sprinter"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Inspeção Visual */}
          {currentStep === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Marque as áreas que possuem avarias e adicione fotos para documentar.
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
              <div className="space-y-2">
                <Label>Nível de Combustível</Label>
                <CombustivelGauge 
                  value={nivelCombustivel} 
                  onChange={setNivelCombustivel} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kmInicial">Quilometragem Inicial *</Label>
                <Input
                  id="kmInicial"
                  type="number"
                  value={kmInicial}
                  onChange={e => setKmInicial(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Gerais</Label>
                <Textarea
                  id="observacoes"
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  placeholder="Observações sobre o estado geral do veículo..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Step 4: Confirmação */}
          {currentStep === 4 && (
            <>
              {/* Resumo */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold">Resumo do Veículo</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Placa:</span>
                    <span className="ml-2 font-medium">{placa.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium">{tipoVeiculo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacidade:</span>
                    <span className="ml-2 font-medium">{capacidade} lugares</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KM Inicial:</span>
                    <span className="ml-2 font-medium">{kmInicial || '-'}</span>
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
                {fornecedor && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span className="ml-2 font-medium">{fornecedor}</span>
                  </div>
                )}
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
                <Label>Status do Veículo</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatusFinal('liberado')}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      statusFinal === 'liberado'
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border hover:border-emerald-500/50"
                    )}
                  >
                    <Check className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                    <span className="font-medium">Liberar</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pronto para uso
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFinal('pendente')}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      statusFinal === 'pendente'
                        ? "border-warning bg-warning/10"
                        : "border-border hover:border-warning/50"
                    )}
                  >
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-warning" />
                    <span className="font-medium">Pendente</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requer atenção
                    </p>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={cn(
                statusFinal === 'liberado' 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "bg-warning hover:bg-warning/90"
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {statusFinal === 'liberado' ? 'Liberar Veículo' : 'Salvar como Pendente'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
