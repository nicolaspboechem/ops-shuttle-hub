import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MultipleImageUploaderProps {
  eventoId: string;
  tempId: string;
  tipo?: 'inspecao' | 'avaria' | 'geral';
  areaVeiculo?: string;
  maxFiles?: number;
  value: string[];
  onChange: (urls: string[]) => void;
  className?: string;
  enableCamera?: boolean;
}

export function MultipleImageUploader({
  eventoId,
  tempId,
  tipo = 'geral',
  areaVeiculo,
  maxFiles = 10,
  value = [],
  onChange,
  className,
  enableCamera = true
}: MultipleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - value.length;
    if (files.length > remainingSlots) {
      toast.error(`Máximo de ${maxFiles} fotos permitidas`);
      return;
    }

    // Validar arquivos
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const ext = file.name.split('.').pop();
        const fileName = `${eventoId}/${tempId}/${tipo}${areaVeiculo ? `-${areaVeiculo}` : ''}-${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('veiculos')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('veiculos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        setProgress(Math.round(((i + 1) / validFiles.length) * 100));
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} foto(s) enviada(s)`);
      }
    } catch (err) {
      console.error('Error uploading:', err);
      toast.error('Erro ao enviar fotos');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (urlToRemove: string) => {
    try {
      // Extrair path do URL
      const path = urlToRemove.split('/veiculos/')[1];
      if (path) {
        await supabase.storage.from('veiculos').remove([path]);
      }
      onChange(value.filter(url => url !== urlToRemove));
      toast.success('Foto removida');
    } catch (err) {
      console.error('Error removing:', err);
      // Remove da lista mesmo se falhar no storage
      onChange(value.filter(url => url !== urlToRemove));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden file inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      {/* Camera input - capture directly from camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Grid de fotos */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url, idx) => (
            <div key={idx} className="relative aspect-square group">
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Área de upload */}
      {value.length < maxFiles && (
        <div className="space-y-2">
          {/* Camera button - mobile optimized */}
          {enableCamera && (
            <button
              type="button"
              onClick={() => !uploading && cameraInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 border-primary/50 bg-primary/10 text-primary font-medium transition-colors",
                "active:bg-primary/20",
                uploading && "pointer-events-none opacity-50"
              )}
            >
              <Camera className="h-6 w-6" />
              <span className="text-base">Tirar Foto</span>
            </button>
          )}
          
          {/* Gallery picker */}
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 text-center cursor-pointer transition-colors",
              "hover:border-primary/50 hover:bg-accent/50 active:bg-accent",
              uploading && "pointer-events-none opacity-50"
            )}
          >
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Enviando... {progress}%</p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px] mx-auto">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecionar da galeria
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {value.length}/{maxFiles} fotos • Máx 5MB cada
                </p>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
