import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickMotoristaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  onCreated: (nome: string) => void;
}

export function QuickMotoristaForm({
  open,
  onOpenChange,
  eventoId,
  onCreated
}: QuickMotoristaFormProps) {
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('Informe o nome do motorista');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('motoristas')
        .insert([{
          evento_id: eventoId,
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          ativo: true,
          criado_por: user?.id || null,
          atualizado_por: user?.id || null
        }]);

      if (error) {
        console.error('Erro ao criar motorista:', error);
        toast.error('Erro ao criar motorista');
        return;
      }

      toast.success('Motorista cadastrado!');
      onCreated(nome.trim());
      onOpenChange(false);
      setNome('');
      setTelefone('');
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar motorista');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Motorista</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do motorista"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
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
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cadastrar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
