import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  eventoId: string;
  tipo: 'banner' | 'logo';
  className?: string;
}

export function ImageUploader({ value, onChange, eventoId, tipo, className }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      // Gerar nome único
      const ext = file.name.split('.').pop();
      const fileName = `${eventoId}/${tipo}-${Date.now()}.${ext}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('eventos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('eventos')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success('Imagem enviada com sucesso');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    onChange(null);
  };

  const aspectClass = tipo === 'banner' ? 'aspect-[3/1]' : 'aspect-square w-32';

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {value ? (
        <div className={cn('relative rounded-lg overflow-hidden border bg-muted', aspectClass)}>
          <img
            src={value}
            alt={tipo}
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 hover:bg-muted hover:border-muted-foreground/50 transition-colors cursor-pointer',
            aspectClass
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                Clique para enviar
              </span>
            </>
          )}
        </button>
      )}

      {!value && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Enviar {tipo === 'banner' ? 'Banner' : 'Logo'}
        </Button>
      )}
    </div>
  );
}
