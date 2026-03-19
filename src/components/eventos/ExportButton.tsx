import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Viagem } from '@/lib/types/viagem';
import { toast } from 'sonner';

interface ExportButtonProps {
  viagens: Viagem[];
  eventoNome?: string;
}

export function ExportButton({ viagens, eventoNome }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      const fileName = `${eventoNome || 'evento'}_viagens_${new Date().toISOString().slice(0, 10)}.xlsx`;

      const data = viagens.map(v => ({
        'Tipo': v.tipo_operacao,
        'Motorista': v.motorista,
        'Veículo': v.tipo_veiculo || '',
        'Placa': v.placa || '',
        'Coordenador': v.coordenador || '',
        'Ponto Embarque': v.ponto_embarque || '',
        'Horário Pickup': formatTime(v.h_pickup),
        'Horário Chegada': formatTime(v.h_chegada),
        'Horário Retorno': formatTime(v.h_retorno),
        'PAX Ida': v.qtd_pax || 0,
        'PAX Retorno': v.qtd_pax_retorno || 0,
        'Status': v.encerrado ? 'Encerrado' : 'Em andamento',
        'Observação': v.observacao || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Viagens');

      XLSX.writeFile(workbook, fileName);
      toast.success(`Arquivo ${fileName} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar arquivo');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={isExporting} onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? 'Exportando...' : 'Exportar Excel'}
    </Button>
  );
}
