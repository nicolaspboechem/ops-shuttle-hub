import { useState, useMemo } from "react";
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
import { ArrowLeft, Search, User, Car, Unlink } from "lucide-react";
import { VeiculoKanbanColumn } from "@/components/veiculos/VeiculoKanbanColumn";
import { useMotoristas, useVeiculos } from "@/hooks/useCadastros";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function VincularVeiculo() {
  const { eventoId, motoristaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { motoristas, updateMotorista } = useMotoristas(eventoId);
  const { veiculos, updateVeiculo } = useVeiculos(eventoId);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Encontrar o motorista atual
  const motorista = motoristas.find(m => m.id === motoristaId);
  const currentVeiculoId = motorista?.veiculo_id;
  const currentVeiculo = veiculos.find(v => v.id === currentVeiculoId);

  // Filtrar e agrupar veículos
  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(v => {
      const matchesSearch = searchTerm === "" || 
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.tipo_veiculo?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [veiculos, searchTerm]);

  // Adicionar nome do motorista vinculado a cada veículo
  const veiculosComMotorista = useMemo(() => {
    return filteredVeiculos.map(v => {
      const motoristaVinculado = motoristas.find(m => m.veiculo_id === v.id);
      return {
        ...v,
        motorista_nome: motoristaVinculado?.nome || null
      };
    });
  }, [filteredVeiculos, motoristas]);

  // Agrupar por status
  const veiculosAgrupados = useMemo(() => {
    return {
      liberado: veiculosComMotorista.filter(v => v.status === 'liberado'),
      pendente: veiculosComMotorista.filter(v => v.status === 'pendente'),
      em_inspecao: veiculosComMotorista.filter(v => v.status === 'em_inspecao'),
      manutencao: veiculosComMotorista.filter(v => v.status === 'manutencao' || !v.status),
    };
  }, [veiculosComMotorista]);

  const selectedVeiculo = veiculos.find(v => v.id === selectedVeiculoId);

  const handleSelectVeiculo = (veiculoId: string) => {
    setSelectedVeiculoId(veiculoId);
    setShowConfirmDialog(true);
  };

  const handleConfirmVinculacao = async () => {
    if (!motorista || !selectedVeiculoId) return;
    
    setIsSubmitting(true);
    try {
      // Se o motorista já tinha um veículo, desvincular
      if (currentVeiculoId) {
        await updateVeiculo(currentVeiculoId, { motorista_id: null });
      }

      // Se o veículo selecionado já tem outro motorista, desvincular
      const outroMotorista = motoristas.find(m => m.veiculo_id === selectedVeiculoId && m.id !== motoristaId);
      if (outroMotorista) {
        await updateMotorista(outroMotorista.id, { veiculo_id: null });
      }

      // Vincular motorista ao novo veículo
      await updateMotorista(motoristaId!, { veiculo_id: selectedVeiculoId });
      await updateVeiculo(selectedVeiculoId, { motorista_id: motoristaId });

      toast({
        title: "Veículo vinculado!",
        description: `${selectedVeiculo?.placa} vinculado a ${motorista.nome}`,
      });

      navigate(`/evento/${eventoId}/motoristas`);
    } catch (error) {
      toast({
        title: "Erro ao vincular",
        description: "Não foi possível vincular o veículo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleDesvincular = async () => {
    if (!motorista || !currentVeiculoId) return;
    
    setIsSubmitting(true);
    try {
      await updateMotorista(motoristaId!, { veiculo_id: null });
      await updateVeiculo(currentVeiculoId, { motorista_id: null });

      toast({
        title: "Veículo desvinculado!",
        description: `${currentVeiculo?.placa} foi desvinculado de ${motorista.nome}`,
      });

      navigate(`/evento/${eventoId}/motoristas`);
    } catch (error) {
      toast({
        title: "Erro ao desvincular",
        description: "Não foi possível desvincular o veículo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!motorista) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Motorista não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/evento/${eventoId}/motoristas`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Vincular Veículo</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Motorista: <span className="font-medium text-foreground">{motorista.nome}</span>
              </p>
            </div>

            {/* Veículo atual */}
            {currentVeiculo && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Car className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">
                  Atual: <strong>{currentVeiculo.placa}</strong>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 px-2 text-destructive hover:text-destructive"
                  onClick={handleDesvincular}
                  disabled={isSubmitting}
                >
                  <Unlink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, tipo ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Kanban - Desktop */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="hidden md:flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <VeiculoKanbanColumn
            status="liberado"
            veiculos={veiculosAgrupados.liberado}
            onSelect={handleSelectVeiculo}
            selectedId={selectedVeiculoId || undefined}
            currentVeiculoId={currentVeiculoId || undefined}
          />
          <VeiculoKanbanColumn
            status="pendente"
            veiculos={veiculosAgrupados.pendente}
            onSelect={handleSelectVeiculo}
            selectedId={selectedVeiculoId || undefined}
            currentVeiculoId={currentVeiculoId || undefined}
          />
          <VeiculoKanbanColumn
            status="em_inspecao"
            veiculos={veiculosAgrupados.em_inspecao}
            onSelect={handleSelectVeiculo}
            selectedId={selectedVeiculoId || undefined}
            currentVeiculoId={currentVeiculoId || undefined}
          />
          <VeiculoKanbanColumn
            status="manutencao"
            veiculos={veiculosAgrupados.manutencao}
            onSelect={handleSelectVeiculo}
            selectedId={selectedVeiculoId || undefined}
            currentVeiculoId={currentVeiculoId || undefined}
          />
        </div>

        {/* Kanban - Mobile (Tabs) */}
        <div className="md:hidden">
          <Tabs defaultValue="liberado" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="liberado" className="text-xs px-1">
                Liberados ({veiculosAgrupados.liberado.length})
              </TabsTrigger>
              <TabsTrigger value="pendente" className="text-xs px-1">
                Pendentes ({veiculosAgrupados.pendente.length})
              </TabsTrigger>
              <TabsTrigger value="em_inspecao" className="text-xs px-1">
                Inspeção ({veiculosAgrupados.em_inspecao.length})
              </TabsTrigger>
              <TabsTrigger value="manutencao" className="text-xs px-1">
                Manutenção ({veiculosAgrupados.manutencao.length})
              </TabsTrigger>
            </TabsList>

            {(['liberado', 'pendente', 'em_inspecao', 'manutencao'] as const).map((status) => (
              <TabsContent key={status} value={status} className="mt-0">
                <VeiculoKanbanColumn
                  status={status}
                  veiculos={veiculosAgrupados[status]}
                  onSelect={handleSelectVeiculo}
                  selectedId={selectedVeiculoId || undefined}
                  currentVeiculoId={currentVeiculoId || undefined}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar vinculação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja vincular o veículo <strong>{selectedVeiculo?.placa}</strong> ({selectedVeiculo?.tipo_veiculo}) ao motorista <strong>{motorista.nome}</strong>?
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
              {isSubmitting ? "Vinculando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
