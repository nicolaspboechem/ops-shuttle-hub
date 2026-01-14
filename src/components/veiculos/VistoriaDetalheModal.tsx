import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  X, 
  AlertTriangle, 
  Camera, 
  ChevronLeft, 
  ChevronRight,
  Fuel,
  Gauge,
  User,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { VistoriaHistorico } from '@/hooks/useVistoriaHistorico';

interface VistoriaDetalheModalProps {
  vistoria: VistoriaHistorico | null;
  open: boolean;
  onClose: () => void;
}

export function VistoriaDetalheModal({ vistoria, open, onClose }: VistoriaDetalheModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  if (!vistoria) return null;

  const areas = vistoria.inspecao_dados?.areas || [];
  const fotosGerais = vistoria.inspecao_dados?.fotosGerais || vistoria.fotos_urls || [];
  const areasComAvaria = areas.filter((a: any) => a.possuiAvaria);

  // Coletar todas as fotos
  const todasFotos: { url: string; label: string }[] = [];
  fotosGerais.forEach((url: string) => {
    todasFotos.push({ url, label: 'Foto Geral' });
  });
  areas.forEach((area: any) => {
    area.fotos?.forEach((url: string) => {
      todasFotos.push({ 
        url, 
        label: `${area.nome}${area.possuiAvaria ? ' (Avaria)' : ''}`
      });
    });
  });

  const handlePrevImage = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : todasFotos.length - 1);
  };

  const handleNextImage = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(selectedImageIndex < todasFotos.length - 1 ? selectedImageIndex + 1 : 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Detalhes da Vistoria
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Calendar className="h-4 w-4" />
            {format(parseISO(vistoria.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vistoria.nivel_combustivel && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Combustível</p>
                    <p className="font-medium">{vistoria.nivel_combustivel}</p>
                  </div>
                </div>
              )}
              {vistoria.km_registrado && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quilometragem</p>
                    <p className="font-medium">{vistoria.km_registrado.toLocaleString('pt-BR')} km</p>
                  </div>
                </div>
              )}
              {vistoria.motorista_nome && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 col-span-2">
                  <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Motorista em Uso</p>
                    <p className="font-medium text-amber-700 dark:text-amber-300">{vistoria.motorista_nome}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Observações */}
            {vistoria.observacoes && (
              <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary">
                <p className="text-sm font-medium mb-1">Observações</p>
                <p className="text-sm text-muted-foreground">{vistoria.observacoes}</p>
              </div>
            )}

            {/* Galeria de fotos gerais */}
            {fotosGerais.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Fotos Gerais ({fotosGerais.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fotosGerais.map((url: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className="relative aspect-video rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img 
                        src={url} 
                        alt={`Foto geral ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Áreas com avarias */}
            {areasComAvaria.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Avarias Encontradas ({areasComAvaria.length})
                </h4>
                <div className="space-y-4">
                  {areasComAvaria.map((area: any) => (
                    <div 
                      key={area.id} 
                      className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {area.nome}
                        </Badge>
                      </div>
                      {area.descricao && (
                        <p className="text-sm text-muted-foreground mb-3">{area.descricao}</p>
                      )}
                      {area.fotos?.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {area.fotos.map((url: string, idx: number) => {
                            const globalIdx = fotosGerais.length + 
                              areas.slice(0, areas.indexOf(area)).reduce((acc: number, a: any) => acc + (a.fotos?.length || 0), 0) + 
                              idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedImageIndex(globalIdx)}
                                className="relative aspect-video rounded-lg overflow-hidden border border-destructive/30 hover:ring-2 hover:ring-destructive transition-all"
                              >
                                <img 
                                  src={url} 
                                  alt={`${area.nome} - Foto ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Áreas sem avarias (se houver fotos) */}
            {areas.filter((a: any) => !a.possuiAvaria && a.fotos?.length > 0).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  Áreas OK com Fotos
                </h4>
                <div className="space-y-4">
                  {areas.filter((a: any) => !a.possuiAvaria && a.fotos?.length > 0).map((area: any) => (
                    <div 
                      key={area.id} 
                      className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5"
                    >
                      <Badge variant="outline" className="mb-2 border-emerald-500 text-emerald-600">
                        {area.nome}
                      </Badge>
                      <div className="grid grid-cols-2 gap-2">
                        {area.fotos.map((url: string, idx: number) => {
                          const globalIdx = fotosGerais.length + 
                            areas.slice(0, areas.indexOf(area)).reduce((acc: number, a: any) => acc + (a.fotos?.length || 0), 0) + 
                            idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(globalIdx)}
                              className="relative aspect-video rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                            >
                              <img 
                                src={url} 
                                alt={`${area.nome} - Foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todasFotos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhuma foto registrada nesta vistoria</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Lightbox para visualização ampliada */}
        {selectedImageIndex !== null && todasFotos[selectedImageIndex] && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedImageIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={handlePrevImage}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <div className="max-w-4xl max-h-[80vh] px-16">
              <img
                src={todasFotos[selectedImageIndex].url}
                alt={todasFotos[selectedImageIndex].label}
                className="max-w-full max-h-[75vh] object-contain"
              />
              <p className="text-center text-white mt-4">
                {todasFotos[selectedImageIndex].label} • {selectedImageIndex + 1} de {todasFotos.length}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={handleNextImage}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
