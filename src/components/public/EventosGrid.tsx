import { EventoCard } from './EventoCard';

interface EventoData {
  id: string;
  nome_planilha: string;
  descricao?: string | null;
  imagem_banner?: string | null;
  imagem_logo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  tipo_operacao?: string | null;
  rotas_count?: number;
}

interface EventosGridProps {
  eventos: EventoData[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export function EventosGrid({ eventos, selectedId, onSelect }: EventosGridProps) {
  if (eventos.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {eventos.map((evento) => (
        <EventoCard
          key={evento.id}
          id={evento.id}
          nome={evento.nome_planilha}
          descricao={evento.descricao}
          imagemBanner={evento.imagem_banner}
          imagemLogo={evento.imagem_logo}
          dataInicio={evento.data_inicio}
          dataFim={evento.data_fim}
          tipoOperacao={evento.tipo_operacao}
          rotasCount={evento.rotas_count}
          onClick={() => onSelect(evento.id)}
          isSelected={evento.id === selectedId}
        />
      ))}
    </div>
  );
}
