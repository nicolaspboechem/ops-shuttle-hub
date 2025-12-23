import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RotaShuttle, RotaShuttleInput } from '@/hooks/useRotasShuttle';

interface RotaShuttleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rota?: RotaShuttle | null;
  onSave: (data: RotaShuttleInput) => Promise<any>;
}

export function RotaShuttleModal({ open, onOpenChange, rota, onSave }: RotaShuttleModalProps) {
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (rota) {
      setNome(rota.nome);
      setOrigem(rota.origem);
      setDestino(rota.destino);
      setFrequencia(rota.frequencia_minutos?.toString() || '');
      setHorarioInicio(rota.horario_inicio?.slice(0, 5) || '');
      setHorarioFim(rota.horario_fim?.slice(0, 5) || '');
      setObservacoes(rota.observacoes || '');
      setAtivo(rota.ativo);
    } else {
      setNome('');
      setOrigem('');
      setDestino('');
      setFrequencia('15');
      setHorarioInicio('07:00');
      setHorarioFim('22:00');
      setObservacoes('');
      setAtivo(true);
    }
  }, [rota, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !origem.trim() || !destino.trim()) {
      return;
    }

    setSaving(true);
    
    await onSave({
      nome: nome.trim(),
      origem: origem.trim(),
      destino: destino.trim(),
      frequencia_minutos: frequencia ? parseInt(frequencia) : null,
      horario_inicio: horarioInicio || null,
      horario_fim: horarioFim || null,
      observacoes: observacoes.trim() || null,
      ativo,
    });

    setSaving(false);
    onOpenChange(false);
  };

  const isValid = nome.trim() && origem.trim() && destino.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rota ? 'Editar Rota' : 'Nova Rota de Shuttle'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Rota *</Label>
            <Input
              id="nome"
              placeholder="Ex: Rota Hotel → Arena"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem *</Label>
              <Input
                id="origem"
                placeholder="De onde sai"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destino">Destino *</Label>
              <Input
                id="destino"
                placeholder="Para onde vai"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequencia">Frequência (min)</Label>
              <Input
                id="frequencia"
                type="number"
                min="1"
                placeholder="15"
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicio">Início</Label>
              <Input
                id="inicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fim">Fim</Label>
              <Input
                id="fim"
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              placeholder="Informações adicionais para passageiros..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="ativo">Rota ativa</Label>
              <p className="text-xs text-muted-foreground">Exibir no painel público</p>
            </div>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {rota ? 'Salvar' : 'Criar Rota'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
