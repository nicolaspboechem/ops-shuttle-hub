import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Car, 
  Fuel, 
  Gauge, 
  Calendar, 
  Camera, 
  AlertTriangle,
  Bus,
  ImageIcon
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Veiculo } from '@/hooks/useCadastros';
import { VeiculoFotosModal } from './VeiculoFotosModal';
import { supabase } from '@/integrations/supabase/client';

interface MotoristaVeiculoTabProps {
  veiculo: Veiculo | null;
}

interface VeiculoFoto {
  id: string;
  url: string;
  area_veiculo: string | null;
  descricao: string | null;
}

export function MotoristaVeiculoTab({ veiculo }: MotoristaVeiculoTabProps) {
  const [showFotosModal, setShowFotosModal] = useState(false);
  const [fotos, setFotos] = useState<VeiculoFoto[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(false);

  useEffect(() => {
    if (veiculo?.id) {
      fetchFotos();
    }
  }, [veiculo?.id]);

  const fetchFotos = async () => {
    if (!veiculo?.id) return;
    setLoadingFotos(true);
    try {
      const { data } = await supabase
        .from('veiculo_fotos')
        .select('id, url, area_veiculo, descricao')
        .eq('veiculo_id', veiculo.id)
        .order('ordem', { ascending: true });
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
    } finally {
      setLoadingFotos(false);
    }
  };

  const getNivelCombustivelLabel = (nivel: string | null | undefined) => {
    const niveis: Record<string, { label: string; color: string }> = {
      'vazio': { label: 'Vazio', color: 'text-red-500' },
      '1/4': { label: '1/4', color: 'text-orange-500' },
      '1/2': { label: '1/2', color: 'text-yellow-500' },
      '3/4': { label: '3/4', color: 'text-emerald-500' },
      'cheio': { label: 'Cheio', color: 'text-emerald-500' }
    };
    return niveis[nivel || ''] || { label: nivel || '-', color: 'text-muted-foreground' };
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'Ônibus') return Bus;
    return Car;
  };

  // Interface para tipagem correta
  interface AreaInspecaoData {
    id: string;
    nome: string;
    possuiAvaria: boolean;
    descricao: string;
    fotos?: string[];
  }

  interface InspecaoDados {
    areas?: AreaInspecaoData[];
    fotosGerais?: string[];
    observacoes?: string;
  }

  // Parse avarias from inspecao_dados - estrutura correta: { areas: [...] }
  const getAvarias = (): { area: string; descricao: string }[] => {
    if (!veiculo?.inspecao_dados) return [];
    
    const dados = veiculo.inspecao_dados as InspecaoDados;
    
    if (!dados.areas || !Array.isArray(dados.areas)) return [];
    
    return dados.areas
      .filter(a => a.possuiAvaria)
      .map(a => ({
        area: a.nome,
        descricao: a.descricao
      }));
  };

  const avarias = getAvarias();

  // Estado sem veículo
  if (!veiculo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Car className="h-20 w-20 mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum veículo atribuído</p>
        <p className="text-sm text-center max-w-xs mt-2">
          Aguarde a atribuição de um veículo pela coordenação
        </p>
      </div>
    );
  }

  const TipoIcon = getTipoIcon(veiculo.tipo_veiculo);
  const combustivel = getNivelCombustivelLabel(veiculo.nivel_combustivel);

  return (
    <div className="space-y-4">
      {/* Card Principal do Veículo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TipoIcon className="h-5 w-5 text-primary" />
              Meu Veículo
            </CardTitle>
            <Badge variant="outline">{veiculo.tipo_veiculo}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Identificação */}
          <div className="flex items-center gap-3">
            <code className="text-2xl font-bold tracking-wider">{veiculo.placa}</code>
            {veiculo.nome && (
              <span className="text-muted-foreground">• {veiculo.nome}</span>
            )}
          </div>

          <Separator />

          {/* Informações */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Combustível</p>
                <p className={`font-medium ${combustivel.color}`}>{combustivel.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">KM Inicial</p>
                <p className="font-medium">
                  {veiculo.km_inicial?.toLocaleString('pt-BR') || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Última Vistoria</p>
                <p className="font-medium">
                  {veiculo.inspecao_data 
                    ? format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : 'Não realizada'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Capacidade */}
          {veiculo.capacidade && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <span className="text-muted-foreground">Capacidade:</span>{' '}
                <span className="font-medium">{veiculo.capacidade} passageiros</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fotos do Veículo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              Fotos do Veículo
            </CardTitle>
            <Badge variant="secondary">{fotos.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {fotos.length > 0 ? (
            <>
              {/* Preview grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {fotos.slice(0, 6).map((foto, index) => (
                  <div 
                    key={foto.id} 
                    className="aspect-square rounded-lg overflow-hidden bg-muted relative"
                  >
                    <img 
                      src={foto.url} 
                      alt={foto.area_veiculo || `Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 5 && fotos.length > 6 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold">+{fotos.length - 6}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowFotosModal(true)}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Ver Todas as Fotos
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma foto registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avarias */}
      <Card className={veiculo.possui_avarias ? 'border-amber-500/30' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={`h-4 w-4 ${veiculo.possui_avarias ? 'text-amber-500' : ''}`} />
              Avarias Registradas
            </CardTitle>
            {veiculo.possui_avarias && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                {avarias.length}
              </Badge>
            )}
          </div>
          {/* Mostrar data da última vistoria */}
          {veiculo.inspecao_data && veiculo.possui_avarias && (
            <p className="text-xs text-muted-foreground mt-1">
              Registrado em {format(parseISO(veiculo.inspecao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {avarias.length > 0 ? (
            <div className="space-y-2">
              {avarias.map((avaria, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <p className="text-sm font-medium capitalize text-amber-700 dark:text-amber-400">
                    {avaria.area}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {avaria.descricao}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma avaria registrada</p>
              <p className="text-xs">O veículo está em boas condições</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Fotos */}
      <VeiculoFotosModal
        open={showFotosModal}
        onOpenChange={setShowFotosModal}
        veiculo={veiculo}
      />
    </div>
  );
}
