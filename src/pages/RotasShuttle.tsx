import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Route, Loader2, MapPin } from 'lucide-react';
import { EventLayout } from '@/components/layout/EventLayout';
import { InnerSidebar, InnerSidebarSection } from '@/components/layout/InnerSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RotaShuttleModal } from '@/components/eventos/RotaShuttleModal';
import { PontoEmbarqueModal } from '@/components/rotas/PontoEmbarqueModal';
import { useRotasShuttle, RotaShuttle, RotaShuttleInput } from '@/hooks/useRotasShuttle';
import { usePontosEmbarque, PontoEmbarque, PontoEmbarqueInput } from '@/hooks/usePontosEmbarque';
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

const sections: InnerSidebarSection[] = [
  { id: 'pontos', label: 'Pontos', icon: MapPin },
  { id: 'rotas', label: 'Rotas', icon: Route },
];

export default function RotasShuttle() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [activeSection, setActiveSection] = useState('pontos');
  
  // Rotas
  const { rotas, loading: loadingRotas, createRota, updateRota, deleteRota } = useRotasShuttle(eventoId);
  const [rotaModalOpen, setRotaModalOpen] = useState(false);
  const [editingRota, setEditingRota] = useState<RotaShuttle | null>(null);
  const [deletingRota, setDeletingRota] = useState<RotaShuttle | null>(null);

  // Pontos
  const { pontos, loading: loadingPontos, createPonto, updatePonto, deletePonto, toggleAtivo, setBase } = usePontosEmbarque(eventoId);
  const [pontoModalOpen, setPontoModalOpen] = useState(false);
  const [editingPonto, setEditingPonto] = useState<PontoEmbarque | null>(null);
  const [deletingPonto, setDeletingPonto] = useState<PontoEmbarque | null>(null);

  // Handlers Rotas
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

  // Handlers Pontos
  const handlePontoSave = async (data: PontoEmbarqueInput) => {
    if (editingPonto) {
      await updatePonto(editingPonto.id, data);
      // Se marcou como base, aplicar exclusividade
      if (data.eh_base) {
        await setBase(editingPonto.id);
      }
    } else {
      const newPonto = await createPonto(data);
      // Se marcou como base no novo ponto
      if (data.eh_base && newPonto?.id) {
        await setBase(newPonto.id);
      }
    }
    setEditingPonto(null);
  };

  const handleDeletePonto = async () => {
    if (deletingPonto) {
      await deletePonto(deletingPonto.id);
      setDeletingPonto(null);
    }
  };

  const openEditPonto = (ponto: PontoEmbarque) => {
    setEditingPonto(ponto);
    setPontoModalOpen(true);
  };

  const openNewPonto = () => {
    setEditingPonto(null);
    setPontoModalOpen(true);
  };

  // Conteúdo: Pontos de Embarque
  const PontosContent = () => (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pontos de Embarque</h1>
          <p className="text-muted-foreground">
            Cadastre pontos que serão usados nas viagens e missões
          </p>
        </div>
        <Button onClick={openNewPonto}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ponto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pontos Cadastrados
          </CardTitle>
          <CardDescription>
            Locais disponíveis para embarque e desembarque
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPontos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pontos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum ponto cadastrado</p>
              <p className="text-sm">Adicione pontos de embarque para usar nas viagens</p>
              <Button onClick={openNewPonto} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Ponto
              </Button>
            </div>
          ) : (
                <div className="space-y-3">
              {pontos.map((ponto) => (
                <div
                  key={ponto.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{ponto.nome}</span>
                      {ponto.eh_base && (
                        <Badge variant="default" className="text-xs">
                          🏠 Base
                        </Badge>
                      )}
                      {!ponto.ativo && (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    {ponto.endereco && (
                      <p className="text-sm text-muted-foreground">{ponto.endereco}</p>
                    )}
                    {ponto.observacao && (
                      <p className="text-xs text-muted-foreground mt-1">{ponto.observacao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ponto.ativo}
                      onCheckedChange={(checked) => toggleAtivo(ponto.id, checked)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditPonto(ponto)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingPonto(ponto)}>
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
  );

  // Conteúdo: Rotas
  const RotasContent = () => (
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
          {loadingRotas ? (
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
  );

  return (
    <EventLayout>
      <div className="flex h-full">
        <InnerSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          storageKey="rotas-sidebar-collapsed"
        />
        
        <div className="flex-1 overflow-auto">
          <div className={activeSection === 'pontos' ? 'block' : 'hidden'}>
            <PontosContent />
          </div>
          <div className={activeSection === 'rotas' ? 'block' : 'hidden'}>
            <RotasContent />
          </div>
        </div>
      </div>

      {/* Ponto Modal */}
      <PontoEmbarqueModal
        open={pontoModalOpen}
        onOpenChange={setPontoModalOpen}
        ponto={editingPonto}
        onSave={handlePontoSave}
      />

      {/* Rota Modal */}
      <RotaShuttleModal
        open={rotaModalOpen}
        onOpenChange={setRotaModalOpen}
        rota={editingRota}
        onSave={handleRotaSave}
      />

      {/* Delete Ponto Confirmation */}
      <AlertDialog open={!!deletingPonto} onOpenChange={() => setDeletingPonto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ponto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o ponto "{deletingPonto?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePonto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Rota Confirmation */}
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
