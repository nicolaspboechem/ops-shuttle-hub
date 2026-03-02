import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save } from 'lucide-react';

interface ObservacaoUnificadaProps {
  observacaoInicial: string | null;
  onSave: (novaObservacao: string) => void;
}

export function ObservacaoUnificada({ observacaoInicial, onSave }: ObservacaoUnificadaProps) {
  const [texto, setTexto] = useState(observacaoInicial || '');
  const [editando, setEditando] = useState(false);

  const handleSave = () => {
    onSave(texto);
    setEditando(false);
  };

  if (editando) {
    return (
      <div className="space-y-2 mb-3">
        <Textarea
          placeholder="Adicionar observação..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-[60px] text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setTexto(observacaoInicial || ''); setEditando(false); }}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1 mb-3">
      <p className="text-sm text-muted-foreground flex-1 line-clamp-2">
        {texto || 'Nenhuma observação'}
      </p>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditando(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
