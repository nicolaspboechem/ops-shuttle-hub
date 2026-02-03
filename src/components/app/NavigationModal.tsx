import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Map, Navigation } from 'lucide-react';

interface NavigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origem?: string | null;
  destino?: string | null;
  title?: string;
}

export function NavigationModal({ 
  open, 
  onOpenChange, 
  origem, 
  destino,
  title = "Viagem Iniciada!"
}: NavigationModalProps) {
  // Gerar URLs dinamicamente
  const mapsUrl = origem && destino 
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`
    : destino 
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`
      : null;
  
  const wazeUrl = destino
    ? `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`
    : null;

  const hasLinks = mapsUrl || wazeUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {/* Rota */}
        <div className="space-y-2 py-4">
          {origem && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span><strong>De:</strong> {origem}</span>
            </div>
          )}
          {destino && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <span><strong>Para:</strong> {destino}</span>
            </div>
          )}
          {!origem && !destino && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Rota não disponível
            </p>
          )}
        </div>

        {/* Botões de Navegação */}
        {hasLinks && (
          <div className="flex gap-3">
            {mapsUrl && (
              <Button 
                variant="outline" 
                className="flex-1 h-14 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => window.open(mapsUrl, '_blank')}
              >
                <Map className="h-5 w-5 mr-2" />
                Google Maps
              </Button>
            )}
            {wazeUrl && (
              <Button 
                variant="outline" 
                className="flex-1 h-14 text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-300"
                onClick={() => window.open(wazeUrl, '_blank')}
              >
                <Navigation className="h-5 w-5 mr-2" />
                Waze
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
