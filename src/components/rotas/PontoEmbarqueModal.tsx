import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { PontoEmbarque, PontoEmbarqueInput } from '@/hooks/usePontosEmbarque';

interface PontoEmbarqueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ponto?: PontoEmbarque | null;
  onSave: (data: PontoEmbarqueInput) => Promise<any>;
}

export function PontoEmbarqueModal({
  open,
  onOpenChange,
  ponto,
  onSave,
}: PontoEmbarqueModalProps) {
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
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
    }
  }, [open, ponto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) return;

    setSaving(true);
    await onSave({
      nome: nome.trim(),
      endereco: endereco.trim() || null,
      observacao: observacao.trim() || null,
      ativo,
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
              placeholder="Ex: Hotel Hilton, Aeroporto GRU..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Endereço completo (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
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

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nome.trim()} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
