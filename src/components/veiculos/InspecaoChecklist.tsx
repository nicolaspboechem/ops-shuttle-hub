import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultipleImageUploader } from './MultipleImageUploader';
import { cn } from '@/lib/utils';
import { 
  Car, 
  CircleDot,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';

export interface AreaInspecao {
  id: string;
  nome: string;
  icon: React.ReactNode;
  possuiAvaria: boolean;
  descricao: string;
  fotos: string[];
}

interface InspecaoChecklistProps {
  eventoId: string;
  tempId: string;
  areas: AreaInspecao[];
  onChange: (areas: AreaInspecao[]) => void;
}

const AREAS_DEFAULT: Omit<AreaInspecao, 'possuiAvaria' | 'descricao' | 'fotos'>[] = [
  { id: 'frente', nome: 'Frente', icon: <Car className="h-4 w-4" /> },
  { id: 'lateral_esquerda', nome: 'Lateral Esquerda', icon: <CircleDot className="h-4 w-4" /> },
  { id: 'lateral_direita', nome: 'Lateral Direita', icon: <CircleDot className="h-4 w-4" /> },
  { id: 'traseira', nome: 'Traseira', icon: <Car className="h-4 w-4 rotate-180" /> },
  { id: 'teto', nome: 'Teto', icon: <Car className="h-4 w-4" /> },
  { id: 'interior', nome: 'Interior', icon: <Car className="h-4 w-4" /> },
];

export function getDefaultAreas(): AreaInspecao[] {
  return AREAS_DEFAULT.map(area => ({
    ...area,
    possuiAvaria: false,
    descricao: '',
    fotos: []
  }));
}

export function InspecaoChecklist({ 
  eventoId, 
  tempId, 
  areas, 
  onChange 
}: InspecaoChecklistProps) {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const handleToggleAvaria = (areaId: string) => {
    onChange(areas.map(area => 
      area.id === areaId 
        ? { ...area, possuiAvaria: !area.possuiAvaria }
        : area
    ));
  };

  const handleDescricaoChange = (areaId: string, descricao: string) => {
    onChange(areas.map(area => 
      area.id === areaId 
        ? { ...area, descricao }
        : area
    ));
  };

  const handleFotosChange = (areaId: string, fotos: string[]) => {
    onChange(areas.map(area => 
      area.id === areaId 
        ? { ...area, fotos }
        : area
    ));
  };

  const totalAvarias = areas.filter(a => a.possuiAvaria).length;

  return (
    <div className="space-y-3">
      {/* Resumo */}
      {totalAvarias > 0 && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {totalAvarias} área(s) com avaria
          </span>
        </div>
      )}

      {/* Lista de áreas */}
      <div className="space-y-2">
        {areas.map((area) => (
          <div 
            key={area.id}
            className={cn(
              "border rounded-lg transition-all",
              area.possuiAvaria 
                ? "border-destructive/50 bg-destructive/5" 
                : "border-border"
            )}
          >
            {/* Header da área */}
            <div 
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedArea(expandedArea === area.id ? null : area.id)}
            >
              <Checkbox
                id={`avaria-${area.id}`}
                checked={area.possuiAvaria}
                onCheckedChange={() => handleToggleAvaria(area.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex items-center gap-2 flex-1">
                {area.icon}
                <Label 
                  htmlFor={`avaria-${area.id}`}
                  className="cursor-pointer font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  {area.nome}
                </Label>
                {area.possuiAvaria && (
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                    Avaria
                  </span>
                )}
                {area.fotos.length > 0 && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {area.fotos.length} foto(s)
                  </span>
                )}
              </div>
              {expandedArea === area.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Conteúdo expandido */}
            {expandedArea === area.id && (
              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                {area.possuiAvaria && (
                  <div className="space-y-2">
                    <Label className="text-sm">Descreva a avaria</Label>
                    <Textarea
                      value={area.descricao}
                      onChange={(e) => handleDescricaoChange(area.id, e.target.value)}
                      placeholder="Ex: Arranhão no para-choque dianteiro..."
                      rows={2}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm">
                    Fotos {area.possuiAvaria ? 'da avaria' : 'desta área'}
                  </Label>
                  <MultipleImageUploader
                    eventoId={eventoId}
                    tempId={tempId}
                    tipo={area.possuiAvaria ? 'avaria' : 'inspecao'}
                    areaVeiculo={area.id}
                    maxFiles={5}
                    value={area.fotos}
                    onChange={(fotos) => handleFotosChange(area.id, fotos)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
