import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Viagem } from '@/lib/types/viagem';
import { MapPin, Clock, Users, Car } from 'lucide-react';

interface MotoristaViagensModalProps {
  motorista: string;
  viagens: Viagem[];
  trigger: React.ReactNode;
}

function formatTime(time: string | null): string {
  if (!time) return '-';
  return time.substring(0, 5);
}

function getStatusBadge(viagem: Viagem) {
  if (viagem.encerrado) {
    return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">Finalizada</Badge>;
  }
  if (viagem.h_retorno) {
    return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Retornou</Badge>;
  }
  if (viagem.h_chegada) {
    return <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-amber-500/30">No local</Badge>;
  }
  return <Badge variant="default" className="bg-purple-500/20 text-purple-500 border-purple-500/30">Em rota</Badge>;
}

export function MotoristaViagensModal({ motorista, viagens, trigger }: MotoristaViagensModalProps) {
  const viagensDoMotorista = viagens
    .filter(v => v.motorista === motorista)
    .sort((a, b) => {
      if (!a.h_pickup && !b.h_pickup) return 0;
      if (!a.h_pickup) return 1;
      if (!b.h_pickup) return -1;
      return a.h_pickup.localeCompare(b.h_pickup);
    });

  const finalizadas = viagensDoMotorista.filter(v => v.encerrado).length;
  const ativas = viagensDoMotorista.filter(v => !v.encerrado).length;
  const totalPax = viagensDoMotorista.reduce((acc, v) => acc + (v.qtd_pax || 0), 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
              {motorista.charAt(0)}
            </div>
            <div>
              <span>Viagens de {motorista}</span>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                {viagensDoMotorista.length} viagens • {finalizadas} finalizadas • {ativas} ativas
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Car className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{viagensDoMotorista.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Passageiros</p>
              <p className="font-semibold">{totalPax}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ativas</p>
              <p className="font-semibold">{ativas}</p>
            </div>
          </div>
        </div>

        {viagensDoMotorista.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma viagem registrada para este motorista.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Chegada</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Ponto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viagensDoMotorista.map((viagem) => (
                  <TableRow key={viagem.id}>
                    <TableCell>{getStatusBadge(viagem)}</TableCell>
                    <TableCell className="font-mono">{formatTime(viagem.h_pickup)}</TableCell>
                    <TableCell className="font-mono">{formatTime(viagem.h_chegada)}</TableCell>
                    <TableCell className="font-mono">{formatTime(viagem.h_retorno)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {viagem.qtd_pax || 0}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{viagem.placa || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                      {viagem.ponto_embarque || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
