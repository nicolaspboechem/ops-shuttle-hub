import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Missao, MissaoInput, MissaoPrioridade } from '@/hooks/useMissoes';
import { Motorista } from '@/hooks/useCadastros';
import { PontoEmbarque } from '@/hooks/usePontosEmbarque';

interface MissaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missao?: Missao | null;
  motoristas: Motorista[];
  pontos: PontoEmbarque[];
  onSave: (data: MissaoInput) => Promise<any>;
}

const prioridadeOptions: { value: MissaoPrioridade; label: string; color: string }[] = [
  { value: 'baixa', label: 'Baixa', color: 'text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'text-foreground' },
  { value: 'alta', label: 'Alta', color: 'text-amber-600' },
  { value: 'urgente', label: 'Urgente', color: 'text-destructive' },
];

export function MissaoModal({
  open,
  onOpenChange,
  missao,
  motoristas,
  pontos,
  onSave,
}: MissaoModalProps) {
  const [motoristaId, setMotoristaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [horarioPrevisto, setHorarioPrevisto] = useState('');
  const [prioridade, setPrioridade] = useState<MissaoPrioridade>('normal');
  const [qtdPax, setQtdPax] = useState<number>(0);
  const [dataProgramada, setDataProgramada] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (missao) {
        setMotoristaId(missao.motorista_id);
        setTitulo(missao.titulo);
        setDescricao(missao.descricao || '');
        setPontoEmbarque(missao.ponto_embarque || '');
        setPontoDesembarque(missao.ponto_desembarque || '');
        setHorarioPrevisto(missao.horario_previsto?.slice(0, 5) || '');
        setPrioridade(missao.prioridade);
        setQtdPax(missao.qtd_pax || 0);
        setDataProgramada(missao.data_programada || new Date().toISOString().slice(0, 10));
      } else {
        setMotoristaId('');
        setTitulo('');
        setDescricao('');
        setPontoEmbarque('');
        setPontoDesembarque('');
        setHorarioPrevisto('');
        setPrioridade('normal');
        setQtdPax(0);
        setDataProgramada(new Date().toISOString().slice(0, 10));
      }
    }
  }, [open, missao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motoristaId || !titulo.trim()) return;

    // Resolver IDs dos pontos selecionados
    const pontoEmbarqueData = pontos.find(p => p.nome === pontoEmbarque);
    const pontoDesembarqueData = pontos.find(p => p.nome === pontoDesembarque);

    setSaving(true);
    await onSave({
      motorista_id: motoristaId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      // Campos de texto (compatibilidade)
      ponto_embarque: pontoEmbarque || null,
      ponto_desembarque: pontoDesembarque || null,
      // Campos FK normalizados
      ponto_embarque_id: pontoEmbarqueData?.id || null,
      ponto_desembarque_id: pontoDesembarqueData?.id || null,
      horario_previsto: horarioPrevisto ? `${horarioPrevisto}:00` : null,
      prioridade,
      qtd_pax: qtdPax,
      data_programada: dataProgramada || null,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const activeMotoristas = motoristas.filter(m => m.ativo);
  const activePontos = pontos.filter(p => p.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {missao ? 'Editar Missão' : 'Nova Missão'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Motorista */}
          <div className="space-y-2">
            <Label>Motorista *</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motorista" />
              </SelectTrigger>
              <SelectContent>
                {activeMotoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Missão *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Buscar VIP no aeroporto"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da missão..."
              rows={2}
            />
          </div>

          {/* Pontos de Embarque e Desembarque */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={pontoEmbarque} onValueChange={setPontoEmbarque}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {activePontos.map((p) => (
                    <SelectItem key={p.id} value={p.nome}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={pontoDesembarque} onValueChange={setPontoDesembarque}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {activePontos.map((p) => (
                    <SelectItem key={p.id} value={p.nome}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data_programada">Data Programada</Label>
              <Input
                id="data_programada"
                type="date"
                value={dataProgramada}
                onChange={(e) => setDataProgramada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario">Horário Previsto</Label>
              <Input
                id="horario"
                type="time"
                value={horarioPrevisto}
                onChange={(e) => setHorarioPrevisto(e.target.value)}
              />
            </div>
          </div>

          {/* PAX e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qtd_pax">Qtd PAX</Label>
              <Input
                id="qtd_pax"
                type="number"
                min={0}
                max={99}
                value={qtdPax}
                onChange={(e) => setQtdPax(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as MissaoPrioridade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prioridadeOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !motoristaId || !titulo.trim()} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Designar Missão'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
