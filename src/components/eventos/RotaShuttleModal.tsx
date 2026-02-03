import { useState, useEffect } from 'react';
import { Loader2, Wand2, ExternalLink } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotaShuttle, RotaShuttleInput } from '@/hooks/useRotasShuttle';
import { usePontosEmbarque } from '@/hooks/usePontosEmbarque';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

interface RotaShuttleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rota?: RotaShuttle | null;
  onSave: (data: RotaShuttleInput) => Promise<any>;
}

export function RotaShuttleModal({ open, onOpenChange, rota, onSave }: RotaShuttleModalProps) {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { pontos } = usePontosEmbarque(eventoId);
  
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [linkMaps, setLinkMaps] = useState('');
  const [linkWaze, setLinkWaze] = useState('');
  const [pontoOrigemId, setPontoOrigemId] = useState<string>('');
  const [pontoDestinoId, setPontoDestinoId] = useState<string>('');

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
      setLinkMaps(rota.link_maps || '');
      setLinkWaze(rota.link_waze || '');
      setPontoOrigemId(rota.ponto_origem_id || '');
      setPontoDestinoId(rota.ponto_destino_id || '');
    } else {
      setNome('');
      setOrigem('');
      setDestino('');
      setFrequencia('15');
      setHorarioInicio('07:00');
      setHorarioFim('22:00');
      setObservacoes('');
      setAtivo(true);
      setLinkMaps('');
      setLinkWaze('');
      setPontoOrigemId('');
      setPontoDestinoId('');
    }
  }, [rota, open]);

  // Sincronizar seleção de ponto com texto de origem/destino
  useEffect(() => {
    if (pontoOrigemId) {
      const ponto = pontos.find(p => p.id === pontoOrigemId);
      if (ponto) setOrigem(ponto.nome);
    }
  }, [pontoOrigemId, pontos]);

  useEffect(() => {
    if (pontoDestinoId) {
      const ponto = pontos.find(p => p.id === pontoDestinoId);
      if (ponto) setDestino(ponto.nome);
    }
  }, [pontoDestinoId, pontos]);

  const gerarLinks = () => {
    const pontoOrigem = pontos.find(p => p.id === pontoOrigemId);
    const pontoDestino = pontos.find(p => p.id === pontoDestinoId);
    
    const enderecoOrigem = pontoOrigem?.endereco || origem;
    const enderecoDestino = pontoDestino?.endereco || destino;
    
    if (!enderecoOrigem || !enderecoDestino) {
      toast.error('Preencha origem e destino (ou cadastre endereços nos pontos)');
      return;
    }

    setLinkMaps(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(enderecoOrigem)}&destination=${encodeURIComponent(enderecoDestino)}&travelmode=driving`);
    setLinkWaze(`https://waze.com/ul?q=${encodeURIComponent(enderecoDestino)}&navigate=yes`);
    toast.success('Links gerados automaticamente');
  };

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
      link_maps: linkMaps.trim() || null,
      link_waze: linkWaze.trim() || null,
      ponto_origem_id: pontoOrigemId || null,
      ponto_destino_id: pontoDestinoId || null,
    });

    setSaving(false);
    onOpenChange(false);
  };

  const isValid = nome.trim() && origem.trim() && destino.trim();
  const pontosAtivos = pontos.filter(p => p.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Pontos de Embarque/Desembarque */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ponto de Origem</Label>
              <Select value={pontoOrigemId} onValueChange={setPontoOrigemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {pontosAtivos.map(ponto => (
                    <SelectItem key={ponto.id} value={ponto.id}>
                      {ponto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ponto de Destino</Label>
              <Select value={pontoDestinoId} onValueChange={setPontoDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {pontosAtivos.map(ponto => (
                    <SelectItem key={ponto.id} value={ponto.id}>
                      {ponto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Texto de Origem/Destino (fallback ou manual) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem (texto) *</Label>
              <Input
                id="origem"
                placeholder="De onde sai"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destino">Destino (texto) *</Label>
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

          {/* Links de Navegação */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Links de Navegação</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={gerarLinks}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Links
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkMaps" className="text-xs text-muted-foreground">Google Maps</Label>
              <div className="flex gap-2">
                <Input
                  id="linkMaps"
                  placeholder="https://www.google.com/maps/dir/..."
                  value={linkMaps}
                  onChange={(e) => setLinkMaps(e.target.value)}
                  className="flex-1 text-xs"
                />
                {linkMaps && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(linkMaps, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkWaze" className="text-xs text-muted-foreground">Waze</Label>
              <div className="flex gap-2">
                <Input
                  id="linkWaze"
                  placeholder="https://waze.com/ul?..."
                  value={linkWaze}
                  onChange={(e) => setLinkWaze(e.target.value)}
                  className="flex-1 text-xs"
                />
                {linkWaze && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(linkWaze, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Os motoristas verão botões para abrir esses links diretamente nos apps de navegação.
            </p>
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
