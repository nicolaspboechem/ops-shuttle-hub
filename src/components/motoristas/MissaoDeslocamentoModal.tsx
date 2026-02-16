import { useState, useEffect } from 'react';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, ChevronsUpDown, Check, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MissaoInput } from '@/hooks/useMissoes';
import { Motorista } from '@/hooks/useCadastros';
import { PontoEmbarque } from '@/hooks/usePontosEmbarque';

interface MissaoDeslocamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoristas: Motorista[];
  pontos: PontoEmbarque[];
  onSave: (data: MissaoInput) => Promise<any>;
}

export function MissaoDeslocamentoModal({
  open,
  onOpenChange,
  motoristas,
  pontos,
  onSave,
}: MissaoDeslocamentoModalProps) {
  const { getAgoraSync } = useServerTime();
  const [motoristaId, setMotoristaId] = useState('');
  const [pontoEmbarque, setPontoEmbarque] = useState('');
  const [pontoDesembarque, setPontoDesembarque] = useState('');
  const [saving, setSaving] = useState(false);
  const [motoristaOpen, setMotoristaOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setMotoristaId('');
      setPontoEmbarque('');
      setPontoDesembarque('');
    }
  }, [open]);

  const activeMotoristas = motoristas.filter(m => m.ativo);
  const activePontos = pontos.filter(p => p.ativo);

  const autoTitle = pontoEmbarque && pontoDesembarque
    ? `Deslocamento: ${pontoEmbarque} → ${pontoDesembarque}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motoristaId || !pontoEmbarque || !pontoDesembarque) return;

    const pontoOrigemData = activePontos.find(p => p.nome === pontoEmbarque);
    const pontoDestinoData = activePontos.find(p => p.nome === pontoDesembarque);

    const agora = getAgoraSync();
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    setSaving(true);
    await onSave({
      motorista_id: motoristaId,
      titulo: autoTitle,
      ponto_embarque: pontoEmbarque,
      ponto_desembarque: pontoDesembarque,
      ponto_embarque_id: pontoOrigemData?.id || null,
      ponto_desembarque_id: pontoDestinoData?.id || null,
      horario_previsto: horaAtual,
      prioridade: 'normal',
      qtd_pax: 0,
      data_programada: getDataOperacional(agora, '04:00'),
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-teal-600" />
            Deslocamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título auto-gerado (preview) */}
          {autoTitle && (
            <div className="rounded-md bg-teal-500/10 border border-teal-500/20 px-3 py-2 text-sm text-teal-700 dark:text-teal-400">
              {autoTitle}
            </div>
          )}

          {/* Motorista */}
          <div className="space-y-2">
            <Label>Motorista *</Label>
            <Popover open={motoristaOpen} onOpenChange={setMotoristaOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={motoristaOpen}
                  className="w-full justify-between font-normal"
                >
                  {motoristaId
                    ? activeMotoristas.find(m => m.id === motoristaId)?.nome || "Selecione"
                    : "Buscar motorista..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar motorista..." />
                  <CommandList>
                    <CommandEmpty>Nenhum motorista encontrado.</CommandEmpty>
                    <CommandGroup>
                      {activeMotoristas.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={m.nome}
                          onSelect={() => {
                            setMotoristaId(m.id);
                            setMotoristaOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              motoristaId === m.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {m.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Origem e Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Origem *</Label>
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
              <Label>Destino *</Label>
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
            <Button
              type="submit"
              disabled={saving || !motoristaId || !pontoEmbarque || !pontoDesembarque}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Deslocamento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
