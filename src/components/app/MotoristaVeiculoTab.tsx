import { useState, useEffect, useMemo } from 'react';
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
  ImageIcon,
  User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Veiculo } from '@/hooks/useCadastros';
import { VeiculoFotosModal } from './VeiculoFotosModal';
import { supabase } from '@/integrations/supabase/client';
import { useVistoriaHistorico } from '@/hooks/useVistoriaHistorico';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ReportarCombustivelModal } from './ReportarCombustivelModal';

interface MotoristaVeiculoTabProps {
  veiculo: Veiculo | null;
  eventoId?: string;
  motoristaId?: string;
}

interface VeiculoFoto {
  id: string;
  url: string;
  area_veiculo: string | null;
  descricao: string | null;
}

// Interface para avaria completa com todos os dados
interface AvariaCompleta {
  area: string;
  descricao: string;
  fotos: string[];
  dataRegistro: string;
  registradoPor: string;
  motoristaEmUso: string | null;
}

export function MotoristaVeiculoTab({ veiculo, eventoId, motoristaId }: MotoristaVeiculoTabProps) {
  const [showFotosModal, setShowFotosModal] = useState(false);
  const [fotos, setFotos] = useState<VeiculoFoto[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showReportarCombustivel, setShowReportarCombustivel] = useState(false);

  // Buscar histórico de vistorias para obter detalhes das avarias
  const { data: vistoriasHistorico } = useVistoriaHistorico(veiculo?.id || null);

  // Pegar a última vistoria que registrou avarias
  const ultimaVistoriaComAvarias = useMemo(() => {
    if (!vistoriasHistorico || !veiculo?.possui_avarias) return null;
    return vistoriasHistorico.find(v => v.possui_avarias);
  }, [vistoriasHistorico, veiculo?.possui_avarias]);

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

  // Extrair avarias com todos os dados completos
  const avariasCompletas = useMemo((): AvariaCompleta[] => {
    // Se temos histórico de vistoria com avarias, usar os dados completos
    if (ultimaVistoriaComAvarias) {
      const dados = ultimaVistoriaComAvarias.inspecao_dados as InspecaoDados;
      if (!dados?.areas) return [];
      
      return dados.areas
        .filter(a => a.possuiAvaria)
        .map(a => ({
          area: a.nome,
          descricao: a.descricao || '',
          fotos: a.fotos || [],
          dataRegistro: ultimaVistoriaComAvarias.created_at,
          registradoPor: ultimaVistoriaComAvarias.realizado_por_nome || 
                         ultimaVistoriaComAvarias.profile?.full_name || 
                         'Coordenação',
          motoristaEmUso: ultimaVistoriaComAvarias.motorista_nome
        }));
    }

    // Fallback para dados do veículo atual (sem histórico)
    if (!veiculo?.inspecao_dados) return [];
    
    const dados = veiculo.inspecao_dados as InspecaoDados;
    
    if (!dados.areas || !Array.isArray(dados.areas)) return [];
    
    return dados.areas
      .filter(a => a.possuiAvaria)
      .map(a => ({
        area: a.nome,
        descricao: a.descricao || '',
        fotos: a.fotos || [],
        dataRegistro: veiculo.inspecao_data || '',
        registradoPor: 'Sistema',
        motoristaEmUso: null
      }));
  }, [ultimaVistoriaComAvarias, veiculo?.inspecao_dados, veiculo?.inspecao_data]);

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

          {/* Botão Reportar Combustível */}
          {eventoId && motoristaId && veiculo?.id && (
            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setShowReportarCombustivel(true)}
            >
              <Fuel className="h-4 w-4 mr-2" />
              Reportar Combustível Baixo
            </Button>
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
                {avariasCompletas.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {avariasCompletas.length > 0 ? (
            <div className="space-y-4">
              {avariasCompletas.map((avaria, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3"
                >
                  {/* Área e descrição */}
                  <div>
                    <p className="text-sm font-semibold capitalize text-amber-700 dark:text-amber-400">
                      {avaria.area}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {avaria.descricao || 'Avaria registrada sem descrição detalhada'}
                    </p>
                  </div>
                  
                  <Separator className="bg-amber-500/20" />
                  
                  {/* Metadados */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {avaria.dataRegistro && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(parseISO(avaria.dataRegistro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>Registrado por: <strong>{avaria.registradoPor}</strong></span>
                    </div>
                    {avaria.motoristaEmUso && (
                      <div className="flex items-center gap-2">
                        <Car className="h-3 w-3" />
                        <span>Veículo estava com: <strong>{avaria.motoristaEmUso}</strong></span>
                      </div>
                    )}
                  </div>
                  
                  {/* Fotos da avaria */}
                  {avaria.fotos.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        Fotos da avaria ({avaria.fotos.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {avaria.fotos.map((foto, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedPhoto(foto)}
                            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-amber-500/30 hover:border-amber-500 transition-colors"
                          >
                            <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

      {/* Modal de Fotos do Veículo */}
      <VeiculoFotosModal
        open={showFotosModal}
        onOpenChange={setShowFotosModal}
        veiculo={veiculo}
      />

      {/* Modal de Foto da Avaria Ampliada */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-1 bg-black/90">
          {selectedPhoto && (
            <img 
              src={selectedPhoto} 
              alt="Foto da avaria" 
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Reportar Combustível */}
      {eventoId && motoristaId && veiculo?.id && (
        <ReportarCombustivelModal
          open={showReportarCombustivel}
          onOpenChange={setShowReportarCombustivel}
          eventoId={eventoId}
          veiculoId={veiculo.id}
          motoristaId={motoristaId}
          nivelAtual={veiculo.nivel_combustivel}
        />
      )}
    </div>
  );
}
