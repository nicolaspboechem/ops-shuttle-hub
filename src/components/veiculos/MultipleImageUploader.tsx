import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
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
}

export function MultipleImageUploader({
  eventoId,
  tempId,
  tipo = 'geral',
  areaVeiculo,
  maxFiles = 10,
  value = [],
  onChange,
  className
}: MultipleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
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
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer transition-colors",
            "hover:border-primary/50 hover:bg-accent/50",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Enviando... {progress}%</p>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
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
                Toque para adicionar fotos
              </p>
              <p className="text-xs text-muted-foreground/70">
                {value.length}/{maxFiles} fotos • Máx 5MB cada
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
