import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventoHeroProps {
  nome: string;
  descricao?: string | null;
  imagemBanner?: string | null;
  imagemLogo?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  onBack?: () => void;
}

export function EventoHero({
  nome,
  descricao,
  imagemBanner,
  imagemLogo,
  dataInicio,
  dataFim,
  onBack,
}: EventoHeroProps) {
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
  };

  const dateRange = dataInicio && dataFim
    ? `${formatDate(dataInicio)} a ${formatDate(dataFim)}`
    : dataInicio
    ? `A partir de ${formatDate(dataInicio)}`
    : '';

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background */}
      <div className="aspect-[21/9] md:aspect-[3/1] relative">
        {imagemBanner ? (
          <img
            src={imagemBanner}
            alt={nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center">
            <MapPin className="h-24 w-24 text-primary-foreground/30" />
          </div>
        )}
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Outros eventos
          </Button>
        )}

        <div className="flex items-end gap-4">
          {/* Logo */}
          {imagemLogo && (
            <img
              src={imagemLogo}
              alt=""
              className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover bg-background shadow-lg hidden md:block"
            />
          )}

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-md">{nome}</h1>
            
            {descricao && (
              <p className="text-white/80 max-w-2xl line-clamp-2">{descricao}</p>
            )}

            {dateRange && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Calendar className="h-4 w-4" />
                <span>{dateRange}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
