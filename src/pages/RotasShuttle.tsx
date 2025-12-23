import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Route, Loader2 } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotaShuttleModal } from '@/components/eventos/RotaShuttleModal';
import { useRotasShuttle, RotaShuttle, RotaShuttleInput } from '@/hooks/useRotasShuttle';
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

export default function RotasShuttle() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { rotas, loading, createRota, updateRota, deleteRota } = useRotasShuttle(eventoId);

  // Modal state
  const [rotaModalOpen, setRotaModalOpen] = useState(false);
  const [editingRota, setEditingRota] = useState<RotaShuttle | null>(null);
  const [deletingRota, setDeletingRota] = useState<RotaShuttle | null>(null);

  const handleRotaSave = async (data: RotaShuttleInput) => {
    if (editingRota) {
      await updateRota(editingRota.id, data);
    } else {
      await createRota(data);
    }
    setEditingRota(null);
  };

  const handleDeleteRota = async () => {
    if (deletingRota) {
      await deleteRota(deletingRota.id);
      setDeletingRota(null);
    }
  };

  const openEditRota = (rota: RotaShuttle) => {
    setEditingRota(rota);
    setRotaModalOpen(true);
  };

  const openNewRota = () => {
    setEditingRota(null);
    setRotaModalOpen(true);
  };

  return (
    <EventLayout>
      <div className="p-8 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rotas de Shuttle</h1>
            <p className="text-muted-foreground">
              Configure rotas com frequência e horários para o painel público
            </p>
          </div>
          <Button onClick={openNewRota}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Rota
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-5 w-5" />
              Rotas Cadastradas
            </CardTitle>
            <CardDescription>
              Rotas exibidas no painel público para passageiros
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rotas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma rota cadastrada</p>
                <p className="text-sm">Adicione rotas de shuttle para exibir no painel público</p>
                <Button onClick={openNewRota} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Rota
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rotas.map((rota) => (
                  <div
                    key={rota.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rota.nome}</span>
                        {!rota.ativo && (
                          <Badge variant="secondary" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rota.origem} → {rota.destino}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {rota.frequencia_minutos && `A cada ${rota.frequencia_minutos} min`}
                        {rota.horario_inicio && rota.horario_fim && ` • ${rota.horario_inicio.slice(0,5)} às ${rota.horario_fim.slice(0,5)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditRota(rota)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingRota(rota)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rota Modal */}
      <RotaShuttleModal
        open={rotaModalOpen}
        onOpenChange={setRotaModalOpen}
        rota={editingRota}
        onSave={handleRotaSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRota} onOpenChange={() => setDeletingRota(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a rota "{deletingRota?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRota} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EventLayout>
  );
}
