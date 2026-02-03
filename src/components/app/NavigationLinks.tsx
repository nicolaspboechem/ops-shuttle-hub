import { Button } from '@/components/ui/button';
import { Map, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationLinksProps {
  linkMaps?: string | null;
  linkWaze?: string | null;
  origem?: string | null;
  destino?: string | null;
  compact?: boolean;
}

export function NavigationLinks({ 
  linkMaps, 
  linkWaze, 
  origem, 
  destino,
  compact = false 
}: NavigationLinksProps) {
  // Gerar links dinamicamente se não existirem mas tiver endereços
  const mapsUrl = linkMaps || (origem && destino 
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`
    : null
  );
  
  const wazeUrl = linkWaze || (destino
    ? `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`
    : null
  );

  if (!mapsUrl && !wazeUrl) return null;

  const handleOpenLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  return (
    <div className={cn("flex gap-2", compact ? "pt-2" : "pt-3 border-t")}>
      {mapsUrl && (
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
          onClick={(e) => handleOpenLink(mapsUrl, e)}
        >
          <Map className="h-4 w-4 mr-2" />
          Maps
        </Button>
      )}
      {wazeUrl && (
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className="flex-1 text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-300"
          onClick={(e) => handleOpenLink(wazeUrl, e)}
        >
          <Navigation className="h-4 w-4 mr-2" />
          Waze
        </Button>
      )}
    </div>
  );
}
