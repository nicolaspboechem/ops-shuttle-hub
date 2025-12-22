import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePontosEmbarque, PontoEmbarque } from '@/hooks/usePontosEmbarque';
import { useMotoristas } from '@/hooks/useCadastros';
import { PontoEmbarqueModal } from '@/components/cadastros/PontoEmbarqueModal';
import { 
  Plus, 
  MapPin, 
  Pencil, 
  Trash2, 
  Users,
  Loader2 
} from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

export default function PontosEmbarque() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { pontos, loading, createPonto, updatePonto, deletePonto, refetch } = usePontosEmbarque(eventoId);
  const { motoristas } = useMotoristas(eventoId);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPonto, setEditingPonto] = useState<PontoEmbarque | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [motoristasSheet, setMotoristasSheet] = useState<PontoEmbarque | null>(null);
  const [selectedMotoristas, setSelectedMotoristas] = useState<string[]>([]);
  const [savingMotoristas, setSavingMotoristas] = useState(false);

  const handleSave = async (data: Omit<PontoEmbarque, 'id' | 'created_at'>) => {
    if (editingPonto) {
      await updatePonto(editingPonto.id, data);
    } else {
      await createPonto(data);
    }
    setEditingPonto(null);
  };

  const handleEdit = (ponto: PontoEmbarque) => {
    setEditingPonto(ponto);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePonto(deleteId);
      setDeleteId(null);
    }
  };

  const openMotoristasSheet = async (ponto: PontoEmbarque) => {
    setMotoristasSheet(ponto);
    
    // Buscar motoristas já vinculados
    const { data } = await supabase
      .from('ponto_motoristas')
      .select('motorista_id')
      .eq('ponto_id', ponto.id);
    
    setSelectedMotoristas(data?.map(d => d.motorista_id) || []);
  };

  const toggleMotorista = (motoristaId: string) => {
    setSelectedMotoristas(prev => 
      prev.includes(motoristaId)
        ? prev.filter(id => id !== motoristaId)
        : [...prev, motoristaId]
    );
  };

  const saveMotoristas = async () => {
    if (!motoristasSheet) return;
    
    setSavingMotoristas(true);
    
    // Deletar todos os vínculos existentes
    await supabase
      .from('ponto_motoristas')
      .delete()
      .eq('ponto_id', motoristasSheet.id);
    
    // Inserir novos vínculos
    if (selectedMotoristas.length > 0) {
      const inserts = selectedMotoristas.map((motoristaId, index) => ({
        ponto_id: motoristasSheet.id,
        motorista_id: motoristaId,
        prioridade: index + 1
      }));
      
      const { error } = await supabase
        .from('ponto_motoristas')
        .insert(inserts);
      
      if (error) {
        console.error('Erro ao salvar motoristas:', error);
        toast.error('Erro ao salvar motoristas');
        setSavingMotoristas(false);
        return;
      }
    }
    
    toast.success('Motoristas atualizados!');
    setSavingMotoristas(false);
    setMotoristasSheet(null);
  };

  if (!eventoId) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pontos de Embarque</h1>
            <p className="text-muted-foreground">
              Gerencie os locais de embarque e motoristas preferenciais
            </p>
          </div>
          <Button onClick={() => { setEditingPonto(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ponto
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pontos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum ponto cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre os pontos de embarque para este evento
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Ponto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pontos.map(ponto => (
              <Card key={ponto.id} className={!ponto.ativo ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{ponto.nome}</CardTitle>
                    </div>
                    {!ponto.ativo && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                  {ponto.endereco && (
                    <CardDescription>{ponto.endereco}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {ponto.observacao && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {ponto.observacao}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMotoristasSheet(ponto)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Motoristas
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(ponto)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(ponto.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      <PontoEmbarqueModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eventoId={eventoId}
        ponto={editingPonto}
        onSave={handleSave}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ponto de Embarque?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ponto será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet para vincular motoristas */}
      <Sheet open={!!motoristasSheet} onOpenChange={() => setMotoristasSheet(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Motoristas - {motoristasSheet?.nome}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os motoristas preferenciais para este ponto:
            </p>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {motoristas.filter(m => m.ativo).map(motorista => (
                <label
                  key={motorista.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedMotoristas.includes(motorista.id)}
                    onCheckedChange={() => toggleMotorista(motorista.id)}
                  />
                  <span>{motorista.nome}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setMotoristasSheet(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveMotoristas}
                disabled={savingMotoristas}
                className="flex-1"
              >
                {savingMotoristas ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
