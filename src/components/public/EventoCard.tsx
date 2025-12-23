import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MapPin, Route } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EventoCardProps {
  id: string;
  nome: string;
  descricao?: string | null;
  imagemBanner?: string | null;
  imagemLogo?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  tipoOperacao?: string | null;
  rotasCount?: number;
  onClick: () => void;
  isSelected?: boolean;
}

export function EventoCard({
  nome,
  descricao,
  imagemBanner,
  imagemLogo,
  dataInicio,
  dataFim,
  tipoOperacao,
  rotasCount = 0,
  onClick,
  isSelected,
}: EventoCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date), 'dd MMM', { locale: ptBR });
  };

  const dateRange = dataInicio && dataFim
    ? `${formatDate(dataInicio)} - ${formatDate(dataFim)}`
    : dataInicio
    ? `A partir de ${formatDate(dataInicio)}`
    : '';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      {/* Background Image */}
      <div className="aspect-[16/9] relative">
        {imagemBanner ? (
          <img
            src={imagemBanner}
            alt={nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
            <MapPin className="h-16 w-16 text-primary/30" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* Logo */}
        {imagemLogo && (
          <div className="absolute top-4 left-4">
            <img
              src={imagemLogo}
              alt=""
              className="h-12 w-12 rounded-lg object-cover bg-background/90 backdrop-blur-sm shadow-lg"
            />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-4 right-4 flex gap-2">
          {tipoOperacao && (
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm capitalize">
              {tipoOperacao}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <h3 className="text-xl font-bold text-foreground line-clamp-1">{nome}</h3>
        
        {descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">{descricao}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {dateRange && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{dateRange}</span>
            </div>
          )}
          {rotasCount > 0 && (
            <div className="flex items-center gap-1">
              <Route className="h-4 w-4" />
              <span>{rotasCount} {rotasCount === 1 ? 'rota' : 'rotas'}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
