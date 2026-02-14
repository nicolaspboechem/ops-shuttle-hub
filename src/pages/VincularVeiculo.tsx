import { useState, useMemo, useDeferredValue, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Search, User, Car, Unlink, CheckCircle, AlertTriangle, Loader, Wrench, ChevronDown, Link2, Fuel, Bus, RefreshCw } from "lucide-react";
import { SwipeableCard } from "@/components/app/SwipeableCard";
import { useMotoristas, useVeiculos } from "@/hooks/useCadastros";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  liberado: {
    title: 'Liberados',
    icon: CheckCircle,
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  pendente: {
    title: 'Pendentes',
    icon: AlertTriangle,
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    headerBg: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  em_inspecao: {
    title: 'Em Inspeção',
    icon: Loader,
    dotColor: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    headerBg: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  manutencao: {
    title: 'Manutenção',
    icon: Wrench,
    dotColor: 'bg-gray-500',
    textColor: 'text-gray-600 dark:text-gray-400',
    headerBg: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
} as const;

const fuelLabels: Record<string, { label: string; color: string }> = {
  cheio: { label: 'Cheio', color: 'text-emerald-600' },
  '3/4': { label: '¾', color: 'text-emerald-500' },
  '1/2': { label: '½', color: 'text-amber-500' },
  '1/4': { label: '¼', color: 'text-orange-500' },
  reserva: { label: 'Reserva', color: 'text-destructive' },
};

export default function VincularVeiculo() {
  const { eventoId, motoristaId } = useParams();
  const navigate = useNavigate();
  const isAppContext = window.location.pathname.startsWith('/app/');
  const { toast } = useToast();
  
  const { motoristas, updateMotorista } = useMotoristas(eventoId);
  const { veiculos, updateVeiculo } = useVeiculos(eventoId);
  
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const motorista = motoristas.find(m => m.id === motoristaId);
  const currentVeiculoId = motorista?.veiculo_id;
  const currentVeiculo = veiculos.find(v => v.id === currentVeiculoId);

  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(v => {
      if (deferredSearchTerm === "") return true;
      const term = deferredSearchTerm.toLowerCase();
      return (
        v.nome?.toLowerCase().includes(term) ||
        v.placa.toLowerCase().includes(term) ||
        v.fornecedor?.toLowerCase().includes(term) ||
        v.tipo_veiculo?.toLowerCase().includes(term)
      );
    });
  }, [veiculos, deferredSearchTerm]);

  const veiculosComMotorista = useMemo(() => {
    return filteredVeiculos
      .map(v => {
        const motoristaVinculado = motoristas.find(m => m.veiculo_id === v.id);
        return { ...v, motorista_nome: motoristaVinculado?.nome || null };
      })
      .sort((a, b) => {
        const nomeA = (a.nome || a.placa).toLowerCase();
        const nomeB = (b.nome || b.placa).toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR', { numeric: true });
      });
  }, [filteredVeiculos, motoristas]);

  const veiculosAgrupados = useMemo(() => ({
    liberado: veiculosComMotorista.filter(v => v.status === 'liberado'),
    pendente: veiculosComMotorista.filter(v => v.status === 'pendente'),
    em_inspecao: veiculosComMotorista.filter(v => v.status === 'em_inspecao'),
    manutencao: veiculosComMotorista.filter(v => v.status === 'manutencao' || !v.status),
  }), [veiculosComMotorista]);

  const selectedVeiculo = veiculos.find(v => v.id === selectedVeiculoId);

  const handleSelectVeiculo = (veiculoId: string) => {
    setSelectedVeiculoId(veiculoId);
    setShowConfirmDialog(true);
  };

  const handleConfirmVinculacao = async () => {
    if (!motorista || !selectedVeiculoId || !eventoId) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    
    setIsSubmitting(true);
    try {
      // Batch all updates in parallel to avoid cascading realtime triggers
      const updates: PromiseLike<any>[] = [];
      const historyInserts: any[] = [];

      // 1. Desvincular veículo anterior do motorista
      if (currentVeiculoId) {
        updates.push(supabase.from('veiculos').update({ motorista_id: null }).eq('id', currentVeiculoId).then());
        historyInserts.push({
          veiculo_id: currentVeiculoId,
          evento_id: eventoId,
          tipo_vistoria: 'desvinculacao',
          status_anterior: currentVeiculo?.status || 'liberado',
          status_novo: currentVeiculo?.status || 'liberado',
          motorista_id: motoristaId,
          motorista_nome: motorista.nome,
          possui_avarias: false,
          observacoes: `Veículo desvinculado - motorista trocou para ${selectedVeiculo?.placa || 'outro'}`,
        });
      }

      // 2. Desvincular outro motorista que tinha esse veículo
      const outroMotorista = motoristas.find(m => m.veiculo_id === selectedVeiculoId && m.id !== motoristaId);
      if (outroMotorista) {
        updates.push(supabase.from('motoristas').update({ veiculo_id: null }).eq('id', outroMotorista.id).then());
      }

      // 3. Vincular novo veículo (bidirecional)
      updates.push(supabase.from('motoristas').update({ veiculo_id: selectedVeiculoId }).eq('id', motoristaId!).then());
      updates.push(supabase.from('veiculos').update({ motorista_id: motoristaId }).eq('id', selectedVeiculoId).then());

      // 4. Histórico da nova vinculação
      historyInserts.push({
        veiculo_id: selectedVeiculoId,
        evento_id: eventoId,
        tipo_vistoria: 'vinculacao',
        status_anterior: selectedVeiculo?.status || 'liberado',
        status_novo: selectedVeiculo?.status || 'liberado',
        motorista_id: motoristaId,
        motorista_nome: motorista.nome,
        possui_avarias: false,
        observacoes: currentVeiculoId 
          ? `Troca de veículo - anterior: ${currentVeiculo?.placa || 'N/A'}`
          : `Veículo vinculado ao motorista ${motorista.nome}`,
      });

      // Execute all updates + history in parallel (single batch)
      if (historyInserts.length > 0) {
        updates.push(supabase.from('veiculo_vistoria_historico').insert(historyInserts).then());
      }
      await Promise.all(updates);

      toast({
        title: currentVeiculoId ? "Veículo trocado!" : "Veículo vinculado!",
        description: `${selectedVeiculo?.placa} vinculado a ${motorista.nome}`,
      });
      navigate(isAppContext ? `/app/${eventoId}/supervisor` : `/evento/${eventoId}/motoristas`);
    } catch (error) {
      toast({ title: "Erro ao vincular", description: "Não foi possível vincular o veículo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      submittingRef.current = false;
    }
  };

  const handleDesvincular = async () => {
    if (!motorista || !currentVeiculoId || !eventoId) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    setIsSubmitting(true);
    try {
      // Batch: desvincular bidirecional + registrar histórico em paralelo
      await Promise.all([
        supabase.from('motoristas').update({ veiculo_id: null }).eq('id', motoristaId!).then(),
        supabase.from('veiculos').update({ motorista_id: null }).eq('id', currentVeiculoId).then(),
        supabase.from('veiculo_vistoria_historico').insert({
          veiculo_id: currentVeiculoId,
          evento_id: eventoId,
          tipo_vistoria: 'desvinculacao',
          status_anterior: currentVeiculo?.status || 'liberado',
          status_novo: currentVeiculo?.status || 'liberado',
          motorista_id: motoristaId,
          motorista_nome: motorista.nome,
          possui_avarias: false,
          observacoes: 'Veículo desvinculado manualmente',
        }).then(),
      ]);

      toast({
        title: "Veículo desvinculado!",
        description: `${currentVeiculo?.placa} foi desvinculado de ${motorista.nome}`,
      });
      navigate(isAppContext ? `/app/${eventoId}/supervisor` : `/evento/${eventoId}/motoristas`);
    } catch (error) {
      toast({ title: "Erro ao desvincular", description: "Não foi possível desvincular o veículo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!motorista) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Motorista não encontrado</p>
      </div>
    );
  }

  const statusOrder = ['liberado', 'pendente', 'em_inspecao', 'manutencao'] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="shrink-0"
              onClick={() => navigate(isAppContext ? `/app/${eventoId}/supervisor` : `/evento/${eventoId}/motoristas`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary shrink-0" />
                <h1 className="text-lg font-bold truncate">Vincular Veículo</h1>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {motorista.nome}
              </p>
            </div>

            {currentVeiculo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                <Car className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium">{currentVeiculo.nome || currentVeiculo.placa}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={handleDesvincular}
                  disabled={isSubmitting}
                >
                  <Unlink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do veículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Lista agrupada */}
      <div className="container max-w-2xl mx-auto px-4 py-4 space-y-3">
        {statusOrder.map((status) => {
          const config = statusConfig[status];
          const items = veiculosAgrupados[status];
          if (items.length === 0) return null;
          const Icon = config.icon;

          return (
            <Collapsible key={status} defaultOpen={status === 'liberado'}>
              <CollapsibleTrigger className={cn(
                "flex items-center gap-2 w-full px-4 py-2.5 rounded-lg border text-left",
                config.headerBg,
                config.borderColor
              )}>
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", config.dotColor)} />
                <Icon className={cn("h-4 w-4 shrink-0", config.textColor)} />
                <span className="font-semibold text-sm flex-1">{config.title}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20", config.textColor)}>
                  {items.length}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2 space-y-1.5">
                {items.map((veiculo) => {
                  const isCurrent = veiculo.id === currentVeiculoId;
                  const fuel = veiculo.nivel_combustivel ? fuelLabels[veiculo.nivel_combustivel] : null;

                  return (
                    <SwipeableCard
                      key={veiculo.id}
                      disabled={isCurrent}
                      rightAction={{
                        icon: <Link2 className="h-5 w-5" />,
                        label: "Vincular",
                        color: "text-white",
                        bgColor: "bg-primary",
                        action: () => handleSelectVeiculo(veiculo.id),
                      }}
                    >
                      <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border bg-card",
                        isCurrent && "ring-2 ring-emerald-500/50 border-emerald-300 dark:border-emerald-700"
                      )}>
                        <Bus className="h-5 w-5 text-muted-foreground shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {veiculo.nome || veiculo.placa}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {veiculo.nome && <span>{veiculo.placa}</span>}
                            <span>{veiculo.tipo_veiculo}</span>
                            {veiculo.capacidade && <span>• {veiculo.capacidade} lug</span>}
                            {fuel && (
                              <span className={cn("flex items-center gap-0.5", fuel.color)}>
                                <Fuel className="h-3 w-3" />
                                {fuel.label}
                              </span>
                            )}
                          </div>
                          {veiculo.motorista_nome && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                              👤 {veiculo.motorista_nome}
                            </p>
                          )}
                        </div>

                        {isCurrent ? (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md shrink-0">
                            Atual
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 h-8 text-xs"
                            onClick={() => handleSelectVeiculo(veiculo.id)}
                          >
                            <Link2 className="h-3.5 w-3.5 mr-1" />
                            Vincular
                          </Button>
                        )}
                      </div>
                    </SwipeableCard>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {veiculosComMotorista.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum veículo encontrado</p>
          </div>
        )}
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentVeiculoId ? 'Confirmar troca de veículo' : 'Confirmar vinculação'}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentVeiculoId ? (
                <>Deseja trocar o veículo atual <strong>{currentVeiculo?.nome || currentVeiculo?.placa}</strong> pelo veículo <strong>{selectedVeiculo?.nome || selectedVeiculo?.placa}</strong> ({selectedVeiculo?.placa}) para o motorista <strong>{motorista.nome}</strong>?</>
              ) : (
                <>Deseja vincular o veículo <strong>{selectedVeiculo?.nome || selectedVeiculo?.placa}</strong> ({selectedVeiculo?.placa}) ao motorista <strong>{motorista.nome}</strong>?</>
              )}
              {selectedVeiculo && motoristas.find(m => m.veiculo_id === selectedVeiculoId && m.id !== motoristaId) && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ Este veículo está vinculado a outro motorista e será desvinculado automaticamente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmVinculacao} disabled={isSubmitting}>
              {isSubmitting ? "Processando..." : currentVeiculoId ? "Confirmar Troca" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
