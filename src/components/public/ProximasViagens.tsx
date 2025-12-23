import { useViagensPublicas } from '@/hooks/useViagensPublicas';
import { ViagemPublicCard } from './ViagemPublicCard';
import { Loader2, Bus } from 'lucide-react';

interface ProximasViagensProps {
  eventoId: string | null;
}

export function ProximasViagens({ eventoId }: ProximasViagensProps) {
  const { viagens, loading } = useViagensPublicas(eventoId);

  if (!eventoId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Selecione um evento para ver as próximas viagens</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (viagens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma viagem programada para hoje</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {viagens.map((viagem) => (
        <ViagemPublicCard key={viagem.id} viagem={viagem} />
      ))}
    </div>
  );
}
