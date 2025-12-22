import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PontoEmbarque } from '@/hooks/usePontosEmbarque';

interface PontoEmbarqueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  ponto?: PontoEmbarque | null;
  onSave: (data: Omit<PontoEmbarque, 'id' | 'created_at'>) => Promise<unknown>;
}

export function PontoEmbarqueModal({
  open,
  onOpenChange,
  eventoId,
  ponto,
  onSave
}: PontoEmbarqueModalProps) {
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ponto) {
      setNome(ponto.nome);
      setEndereco(ponto.endereco || '');
      setObservacao(ponto.observacao || '');
      setAtivo(ponto.ativo);
    } else {
      setNome('');
      setEndereco('');
      setObservacao('');
      setAtivo(true);
    }
  }, [ponto, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSaving(true);
    await onSave({
      evento_id: eventoId,
      nome: nome.trim(),
      endereco: endereco.trim() || null,
      observacao: observacao.trim() || null,
      ativo
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {ponto ? 'Editar Ponto de Embarque' : 'Novo Ponto de Embarque'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Hotel Marriott"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Ativo</Label>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nome.trim()} className="flex-1">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
