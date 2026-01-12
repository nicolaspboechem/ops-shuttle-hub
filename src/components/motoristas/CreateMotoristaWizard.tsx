import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Veiculo } from "@/hooks/useCadastros";
import { User, Phone, Car, Check, ChevronRight, ChevronLeft, AlertTriangle, Fuel, Bus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateMotoristaWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculos: Veiculo[];
  onSubmit: (data: { nome: string; telefone: string; veiculo_id?: string }) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  liberado: { label: 'Liberados', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
  pendente: { label: 'Pendentes', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  em_inspecao: { label: 'Em Inspeção', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  manutencao: { label: 'Manutenção', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-950/30' },
};

export function CreateMotoristaWizard({ open, onOpenChange, veiculos, onSubmit }: CreateMotoristaWizardProps) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Agrupar veículos por status
  const veiculosPorStatus = veiculos.reduce((acc, v) => {
    const status = v.status || 'pendente';
    if (!acc[status]) acc[status] = [];
    acc[status].push(v);
    return acc;
  }, {} as Record<string, Veiculo[]>);

  // Filtrar veículos disponíveis (sem motorista vinculado)
  const veiculosDisponiveis = veiculos.filter(v => !v.motorista_id);

  const veiculosDisponiveisPorStatus = veiculosDisponiveis.reduce((acc, v) => {
    const status = v.status || 'pendente';
    if (!acc[status]) acc[status] = [];
    acc[status].push(v);
    return acc;
  }, {} as Record<string, Veiculo[]>);

  const selectedVeiculo = veiculos.find(v => v.id === selectedVeiculoId);

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        telefone: telefone.trim(),
        veiculo_id: selectedVeiculoId || undefined,
      });
      // Reset form
      setNome("");
      setTelefone("");
      setSelectedVeiculoId(null);
      setStep(1);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNome("");
    setTelefone("");
    setSelectedVeiculoId(null);
    setStep(1);
    onOpenChange(false);
  };

  const canProceedStep1 = nome.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Novo Motorista
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-12 h-1 rounded-full",
                    step > s ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Dados Básicos */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Dados do Motorista</h3>
                <p className="text-sm text-muted-foreground">Preencha as informações básicas</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome completo do motorista"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone/WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Vincular Veículo */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Vincular Veículo</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione um veículo disponível ou vincule depois
                </p>
              </div>

              {veiculosDisponiveis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum veículo disponível para vinculação</p>
                  <p className="text-xs mt-1">Todos os veículos já estão vinculados a motoristas</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {['liberado', 'pendente', 'em_inspecao', 'manutencao'].map((status) => {
                      const config = STATUS_CONFIG[status];
                      const veiculosDoStatus = veiculosDisponiveisPorStatus[status] || [];
                      
                      return (
                        <div key={status} className={cn("rounded-lg p-2", config.bgColor)}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-xs font-semibold", config.color)}>
                              {config.label}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {veiculosDoStatus.length}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {veiculosDoStatus.map((veiculo) => (
                              <Card
                                key={veiculo.id}
                                className={cn(
                                  "cursor-pointer transition-all hover:shadow-md",
                                  selectedVeiculoId === veiculo.id
                                    ? "ring-2 ring-primary bg-primary/5"
                                    : "hover:bg-accent/50"
                                )}
                                onClick={() => setSelectedVeiculoId(
                                  selectedVeiculoId === veiculo.id ? null : veiculo.id
                                )}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono font-bold text-sm">
                                      {veiculo.placa}
                                    </span>
                                    {selectedVeiculoId === veiculo.id && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Bus className="h-3 w-3" />
                                    <span>{veiculo.tipo_veiculo}</span>
                                  </div>
                                  
                                  {veiculo.fornecedor && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {veiculo.fornecedor}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-2 mt-2">
                                    {veiculo.possui_avarias && (
                                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    )}
                                    {veiculo.nivel_combustivel && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <Fuel className="h-3 w-3" />
                                        <span>{veiculo.nivel_combustivel}</span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {veiculosDoStatus.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                Nenhum veículo
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedVeiculoId(null);
                      setStep(3);
                    }}
                  >
                    Vincular Depois
                  </Button>
                  <Button onClick={() => setStep(3)}>
                    {selectedVeiculoId ? "Confirmar Veículo" : "Continuar"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmação */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Confirmar Cadastro</h3>
                <p className="text-sm text-muted-foreground">Revise as informações antes de criar</p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{nome}</p>
                      {telefone && (
                        <p className="text-sm text-muted-foreground">{telefone}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Veículo Vinculado</p>
                    {selectedVeiculo ? (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Car className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-mono font-bold">{selectedVeiculo.placa}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedVeiculo.tipo_veiculo}
                            {selectedVeiculo.fornecedor && ` • ${selectedVeiculo.fornecedor}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum veículo vinculado (será vinculado posteriormente)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Motorista"}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
