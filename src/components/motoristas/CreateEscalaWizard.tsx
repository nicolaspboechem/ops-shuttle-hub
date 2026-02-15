import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, Users } from 'lucide-react';
import { Motorista } from '@/hooks/useCadastros';
import { Escala } from '@/hooks/useEscalas';

interface EscalaParaEditar extends Escala {
  motorista_ids: string[];
}

interface CreateEscalaWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoristas: Motorista[];
  escalasExistentes: Escala[];
  getEscalaByMotorista: (motoristaId: string) => Escala | undefined;
  onSubmit: (data: { nome: string; horario_inicio: string; horario_fim: string; motorista_ids: string[] }) => Promise<void>;
  escalaParaEditar?: EscalaParaEditar | null;
  onEdit?: (escalaId: string, data: { nome: string; horario_inicio: string; horario_fim: string; motorista_ids: string[] }) => Promise<void>;
}

export function CreateEscalaWizard({
  open,
  onOpenChange,
  motoristas,
  escalasExistentes,
  getEscalaByMotorista,
  onSubmit,
  escalaParaEditar,
  onEdit,
}: CreateEscalaWizardProps) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('06:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [selectedMotoristas, setSelectedMotoristas] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!escalaParaEditar;

  useEffect(() => {
    if (escalaParaEditar && open) {
      setNome(escalaParaEditar.nome);
      setHorarioInicio(escalaParaEditar.horario_inicio?.slice(0, 5) || '06:00');
      setHorarioFim(escalaParaEditar.horario_fim?.slice(0, 5) || '18:00');
      setSelectedMotoristas(escalaParaEditar.motorista_ids);
      setStep(1);
    }
  }, [escalaParaEditar, open]);

  const reset = () => {
    setStep(1);
    setNome('');
    setHorarioInicio('06:00');
    setHorarioFim('18:00');
    setSelectedMotoristas([]);
    setSearchTerm('');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const filteredMotoristas = motoristas
    .filter(m => m.ativo !== false)
    .filter(m => !searchTerm || m.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleMotorista = (id: string) => {
    setSelectedMotoristas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = {
        nome,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        motorista_ids: selectedMotoristas,
      };
      if (isEditing && onEdit) {
        await onEdit(escalaParaEditar.id, data);
      } else {
        await onSubmit(data);
      }
      handleClose(false);
    } catch {
      // error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 ? <Clock className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            {step === 1
              ? (isEditing ? 'Editar Escala - Dados' : 'Nova Escala - Dados')
              : (isEditing ? 'Editar Escala - Motoristas' : 'Nova Escala - Motoristas')}
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Defina o nome e horário da escala' : 'Selecione os motoristas desta escala'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da escala</Label>
              <Input
                placeholder="Ex: Turno Diurno"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" value={horarioInicio} onChange={e => setHorarioInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" value={horarioFim} onChange={e => setHorarioFim(e.target.value)} />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!nome.trim()}
            >
              Próximo
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar motorista..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-auto space-y-1 max-h-[40vh]">
              {filteredMotoristas.map(m => {
                const escalaAtual = getEscalaByMotorista(m.id);
                const isInCurrentEscala = isEditing && escalaAtual?.id === escalaParaEditar.id;
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMotoristas.includes(m.id)}
                      onCheckedChange={() => toggleMotorista(m.id)}
                    />
                    <span className="flex-1 text-sm font-medium">{m.nome}</span>
                    {escalaAtual && !isInCurrentEscala && (
                      <Badge variant="outline" className="text-xs">
                        {escalaAtual.nome}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedMotoristas.length} selecionados
                </span>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Escala'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
