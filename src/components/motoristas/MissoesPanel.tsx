import { useState, useMemo } from 'react';
import { Plus, Search, Filter, X, LayoutGrid, List, Columns, User, Calendar, MoreVertical, Pencil, Trash2, CheckCircle, XCircle, Play, ClipboardList, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';

import { useMissoes, Missao, MissaoStatus } from '@/hooks/useMissoes';
import { useMotoristas } from '@/hooks/useCadastros';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { MissaoModal } from '@/components/motoristas/MissaoModal';
import { MissaoCard } from '@/components/motoristas/MissaoCard';
import { MissaoKanbanCard } from '@/components/motoristas/MissaoKanbanCard';
import { MissaoKanbanColumn } from '@/components/motoristas/MissaoKanbanColumn';
import { MissaoTipoModal, MissaoTipo } from '@/components/motoristas/MissaoTipoModal';
import { MissaoInstantaneaModal } from '@/components/motoristas/MissaoInstantaneaModal';

interface MissoesPanelProps {
  eventoId: string | undefined;
}

const missaoKanbanColumns = [
  { id: 'pendente', title: 'Pendente', accent: 'bg-yellow-500' },
  { id: 'aceita', title: 'Aceita', accent: 'bg-blue-500' },
  { id: 'em_andamento', title: 'Em Andamento', accent: 'bg-amber-500' },
  { id: 'concluida', title: 'Concluída', accent: 'bg-green-500' },
  { id: 'cancelada', title: 'Cancelada', accent: 'bg-destructive' },
];

export function MissoesPanel({ eventoId }: MissoesPanelProps) {
  const { missoes, loading: loadingMissoes, createMissao, updateMissao, deleteMissao } = useMissoes(eventoId);
  const { motoristas: motoristasCadastrados } = useMotoristas(eventoId);
  const { pontos: pontosEmbarque } = usePontosEmbarque(eventoId);

  // Filter states
  const [missaoFilter, setMissaoFilter] = useState<string>('all');
  const [missaoMotoristaFilter, setMissaoMotoristaFilter] = useState<string>('all');
  const [missaoPontoAFilter, setMissaoPontoAFilter] = useState<string>('all');
  const [missaoPontoBFilter, setMissaoPontoBFilter] = useState<string>('all');
  const [missaoViewMode, setMissaoViewMode] = useState<'card' | 'list' | 'kanban'>('kanban');
  const [missaoSearchTerm, setMissaoSearchTerm] = useState('');
  const [missaoDataFilter, setMissaoDataFilter] = useState<string>(new Date().toISOString().slice(0, 10));

  // Modal states
  const [showMissaoModal, setShowMissaoModal] = useState(false);
  const [showMissaoTipoModal, setShowMissaoTipoModal] = useState(false);
  const [showMissaoInstantanea, setShowMissaoInstantanea] = useState(false);
  const [editingMissao, setEditingMissao] = useState<Missao | null>(null);

  // Drag state
  const [activeMissao, setActiveMissao] = useState<Missao | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Filtered missions
  const filteredMissoes = useMemo(() => {
    let filtered = [...missoes];
    
    if (missaoDataFilter) {
      filtered = filtered.filter(m => {
        if (!m.data_programada) {
          const createdDate = m.created_at ? m.created_at.slice(0, 10) : '';
          return createdDate === missaoDataFilter;
        }
        return m.data_programada === missaoDataFilter;
      });
    }
    
    if (missaoFilter !== 'all') {
      filtered = filtered.filter(m => m.status === missaoFilter);
    }
    
    if (missaoMotoristaFilter !== 'all') {
      filtered = filtered.filter(m => m.motorista_id === missaoMotoristaFilter);
    }

    if (missaoPontoAFilter !== 'all') {
      filtered = filtered.filter(m => m.ponto_embarque === missaoPontoAFilter);
    }

    if (missaoPontoBFilter !== 'all') {
      filtered = filtered.filter(m => m.ponto_desembarque === missaoPontoBFilter);
    }
    
    if (missaoSearchTerm) {
      const term = missaoSearchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.titulo.toLowerCase().includes(term) ||
        m.descricao?.toLowerCase().includes(term) ||
        m.ponto_embarque?.toLowerCase().includes(term) ||
        m.ponto_desembarque?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [missoes, missaoFilter, missaoMotoristaFilter, missaoPontoAFilter, missaoPontoBFilter, missaoSearchTerm, missaoDataFilter]);

  const handleSaveMissao = async (data: any) => {
    if (editingMissao) {
      await updateMissao(editingMissao.id, data);
    } else {
      await createMissao(data);
    }
    setShowMissaoModal(false);
    setEditingMissao(null);
  };

  const handleDeleteMissao = async (id: string) => {
    await deleteMissao(id);
  };

  const clearMissaoFilters = () => {
    setMissaoFilter('all');
    setMissaoMotoristaFilter('all');
    setMissaoPontoAFilter('all');
    setMissaoPontoBFilter('all');
    setMissaoSearchTerm('');
    setMissaoDataFilter(new Date().toISOString().slice(0, 10));
  };

  const hasActiveMissaoFilters = missaoFilter !== 'all' || missaoMotoristaFilter !== 'all' || missaoPontoAFilter !== 'all' || missaoPontoBFilter !== 'all' || missaoSearchTerm || missaoDataFilter !== new Date().toISOString().slice(0, 10);

  const handleMissaoDragStart = (event: DragStartEvent) => {
    const missao = filteredMissoes.find(m => m.id === event.active.id);
    if (missao) setActiveMissao(missao);
  };

  const handleMissaoDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMissao(null);
    if (!over) return;
    
    const missaoId = active.id as string;
    const newStatus = over.id as string;
    
    const validStatuses = ['pendente', 'aceita', 'em_andamento', 'concluida', 'cancelada'];
    if (!validStatuses.includes(newStatus)) return;
    
    const missao = filteredMissoes.find(m => m.id === missaoId);
    if (!missao || missao.status === newStatus) return;
    
    await updateMissao(missaoId, { status: newStatus as MissaoStatus });
  };

  // Group missions by status for kanban
  const missoesByStatus = useMemo(() => {
    const grouped: Record<string, Missao[]> = {
      pendente: [],
      aceita: [],
      em_andamento: [],
      concluida: [],
      cancelada: [],
    };
    filteredMissoes.forEach(m => {
      if (grouped[m.status]) grouped[m.status].push(m);
    });
    return grouped;
  }, [filteredMissoes]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Missões</h1>
          <p className="text-sm text-muted-foreground">
            Designe missões específicas para motoristas
          </p>
        </div>
        <Button onClick={() => { setEditingMissao(null); setShowMissaoTipoModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Missão
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar missão..."
            value={missaoSearchTerm}
            onChange={(e) => setMissaoSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={missaoFilter} onValueChange={setMissaoFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aceita">Aceitas</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluídas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={missaoMotoristaFilter} onValueChange={setMissaoMotoristaFilter}>
            <SelectTrigger className="w-[180px]">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos motoristas</SelectItem>
              {motoristasCadastrados.filter(m => m.ativo).map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={missaoPontoAFilter} onValueChange={setMissaoPontoAFilter}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ponto A" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Ponto A</SelectItem>
              {pontosEmbarque.map(p => (
                <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={missaoPontoBFilter} onValueChange={setMissaoPontoBFilter}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ponto B" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Ponto B</SelectItem>
              {pontosEmbarque.map(p => (
                <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={missaoDataFilter}
              onChange={(e) => setMissaoDataFilter(e.target.value)}
              className="w-[160px]"
            />
          </div>
          {hasActiveMissaoFilters && (
            <Button variant="ghost" size="icon" onClick={clearMissaoFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center border rounded-md ml-2">
            <Button
              variant={missaoViewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMissaoViewMode('kanban')}
              className="rounded-r-none"
            >
              <Columns className="w-4 h-4" />
            </Button>
            <Button
              variant={missaoViewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMissaoViewMode('card')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={missaoViewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMissaoViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {loadingMissoes ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredMissoes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma missão encontrada</p>
          <p className="text-sm">
            {hasActiveMissaoFilters ? 'Tente ajustar os filtros' : 'Crie uma missão para designar um motorista'}
          </p>
        </div>
      ) : missaoViewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleMissaoDragStart}
          onDragEnd={handleMissaoDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {missaoKanbanColumns.map(col => (
              <MissaoKanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                count={missoesByStatus[col.id]?.length || 0}
                accentColor={col.accent}
              >
                {(missoesByStatus[col.id] || []).map(missao => {
                  const motorista = motoristasCadastrados.find(m => m.id === missao.motorista_id);
                  return (
                    <MissaoKanbanCard
                      key={missao.id}
                      missao={missao}
                      motoristaNome={motorista?.nome}
                      onEdit={() => { setEditingMissao(missao); setShowMissaoModal(true); }}
                      onDelete={() => handleDeleteMissao(missao.id)}
                      onStatusChange={(status) => updateMissao(missao.id, { status: status as MissaoStatus })}
                    />
                  );
                })}
              </MissaoKanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeMissao ? (
              <MissaoKanbanCard
                missao={activeMissao}
                motoristaNome={motoristasCadastrados.find(m => m.id === activeMissao.motorista_id)?.nome}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : missaoViewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissoes.map(missao => {
            const motorista = motoristasCadastrados.find(m => m.id === missao.motorista_id);
            return (
              <MissaoCard
                key={missao.id}
                missao={missao}
                motoristaNome={motorista?.nome || 'Motorista não encontrado'}
                onEdit={() => { setEditingMissao(missao); setShowMissaoModal(true); }}
                onDelete={() => handleDeleteMissao(missao.id)}
                onStatusChange={(status) => updateMissao(missao.id, { status: status as MissaoStatus })}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>PAX</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMissoes.map(missao => {
                const motorista = motoristasCadastrados.find(m => m.id === missao.motorista_id);
                const prioridadeColors: Record<string, string> = {
                  baixa: 'bg-muted text-muted-foreground',
                  normal: 'bg-primary/10 text-primary',
                  alta: 'bg-amber-500/10 text-amber-600',
                  urgente: 'bg-destructive/10 text-destructive',
                };
                const statusColors: Record<string, string> = {
                  pendente: 'bg-muted text-muted-foreground',
                  aceita: 'bg-blue-500/10 text-blue-600',
                  em_andamento: 'bg-amber-500/10 text-amber-600',
                  concluida: 'bg-green-500/10 text-green-600',
                  cancelada: 'bg-destructive/10 text-destructive',
                };
                
                return (
                  <TableRow key={missao.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{missao.titulo}</p>
                        {missao.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{missao.descricao}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {motorista?.nome?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm">{motorista?.nome || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {missao.data_programada 
                        ? missao.data_programada === new Date().toISOString().slice(0, 10) 
                          ? 'Hoje' 
                          : missao.data_programada.split('-').reverse().slice(0, 2).join('/')
                        : 'Imediata'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {missao.ponto_embarque && missao.ponto_desembarque ? (
                        <span>{missao.ponto_embarque} → {missao.ponto_desembarque}</span>
                      ) : missao.ponto_embarque || missao.ponto_desembarque || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {missao.horario_previsto?.slice(0, 5) || '-'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {missao.qtd_pax || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={prioridadeColors[missao.prioridade]}>
                        {missao.prioridade === 'baixa' ? 'Baixa' : 
                         missao.prioridade === 'normal' ? 'Normal' :
                         missao.prioridade === 'alta' ? 'Alta' : 'Urgente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[missao.status]}>
                        {missao.status === 'pendente' ? 'Pendente' :
                         missao.status === 'aceita' ? 'Aceita' :
                         missao.status === 'em_andamento' ? 'Em Andamento' :
                         missao.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingMissao(missao); setShowMissaoModal(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {missao.status === 'pendente' && (
                            <DropdownMenuItem onClick={() => updateMissao(missao.id, { status: 'aceita' })}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aceitar
                            </DropdownMenuItem>
                          )}
                          {missao.status === 'aceita' && (
                            <DropdownMenuItem onClick={() => updateMissao(missao.id, { status: 'em_andamento' })}>
                              <Play className="w-4 h-4 mr-2" />
                              Iniciar
                            </DropdownMenuItem>
                          )}
                          {missao.status !== 'concluida' && (
                            <DropdownMenuItem onClick={() => updateMissao(missao.id, { status: 'concluida' })}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Concluir
                            </DropdownMenuItem>
                          )}
                          {missao.status !== 'cancelada' && (
                            <DropdownMenuItem onClick={() => updateMissao(missao.id, { status: 'cancelada' })} className="text-destructive">
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDeleteMissao(missao.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal de tipo de missão */}
      <MissaoTipoModal
        open={showMissaoTipoModal}
        onOpenChange={setShowMissaoTipoModal}
        onSelect={(tipo: MissaoTipo) => {
          if (tipo === 'instantanea') {
            setShowMissaoInstantanea(true);
          } else {
            setShowMissaoModal(true);
          }
        }}
      />

      {/* Missão Instantânea */}
      <MissaoInstantaneaModal
        open={showMissaoInstantanea}
        onOpenChange={setShowMissaoInstantanea}
        motoristas={motoristasCadastrados}
        pontos={pontosEmbarque}
        onSave={async (data) => {
          await createMissao(data);
        }}
      />

      {/* Missão Agendada (completa) */}
      <MissaoModal
        open={showMissaoModal}
        onOpenChange={(open) => { setShowMissaoModal(open); if (!open) setEditingMissao(null); }}
        missao={editingMissao}
        motoristas={motoristasCadastrados}
        pontos={pontosEmbarque}
        onSave={handleSaveMissao}
      />
    </div>
  );
}