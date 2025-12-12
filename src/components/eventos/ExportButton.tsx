import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Viagem } from '@/lib/types/viagem';
import { toast } from 'sonner';

interface ExportButtonProps {
  viagensTransfer: Viagem[];
  viagensShuttle: Viagem[];
  eventoNome?: string;
}

export function ExportButton({ viagensTransfer, viagensShuttle, eventoNome }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const prepareViagensData = (viagens: Viagem[], tipo: string) => {
    return viagens.map(v => ({
      'Tipo': tipo,
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
  };

  const handleExport = async (tipo: 'geral' | 'transfer' | 'shuttle') => {
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      const fileName = `${eventoNome || 'evento'}_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      if (tipo === 'geral') {
        // Export all data with separate sheets
        const transferData = prepareViagensData(viagensTransfer, 'Transfer');
        const shuttleData = prepareViagensData(viagensShuttle, 'Shuttle');
        const allData = [...transferData, ...shuttleData];
        
        const wsGeral = XLSX.utils.json_to_sheet(allData);
        XLSX.utils.book_append_sheet(workbook, wsGeral, 'Geral');
        
        if (viagensTransfer.length > 0) {
          const wsTransfer = XLSX.utils.json_to_sheet(transferData);
          XLSX.utils.book_append_sheet(workbook, wsTransfer, 'Transfer');
        }
        
        if (viagensShuttle.length > 0) {
          const wsShuttle = XLSX.utils.json_to_sheet(shuttleData);
          XLSX.utils.book_append_sheet(workbook, wsShuttle, 'Shuttle');
        }
      } else if (tipo === 'transfer') {
        const transferData = prepareViagensData(viagensTransfer, 'Transfer');
        const ws = XLSX.utils.json_to_sheet(transferData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Transfer');
      } else {
        const shuttleData = prepareViagensData(viagensShuttle, 'Shuttle');
        const ws = XLSX.utils.json_to_sheet(shuttleData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Shuttle');
      }

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('geral')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Geral (Todos os dados)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('transfer')} disabled={viagensTransfer.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-amber-500" />
          Apenas Transfer ({viagensTransfer.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('shuttle')} disabled={viagensShuttle.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
          Apenas Shuttle ({viagensShuttle.length})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
