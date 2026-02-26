import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Viagem } from '@/lib/types/viagem';
import { Motorista } from '@/hooks/useCadastros';
import * as XLSX from 'xlsx';

interface Props {
  viagensFiltradas: Viagem[];
  motoristas: Motorista[];
}

export function AuditoriaVeiculosTab({ viagensFiltradas, motoristas }: Props) {
  const veiculosData = useMemo(() => {
    const map = new Map<string, { placa: string; tipo: string; viagens: number; pax: number }>();
    viagensFiltradas.forEach(v => {
      const placa = v.placa || 'Sem placa';
      const existing = map.get(placa) || { placa, tipo: v.tipo_veiculo || 'Outro', viagens: 0, pax: 0 };
      existing.viagens += 1;
      existing.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      map.set(placa, existing);
    });

    return Array.from(map.values())
      .map(v => {
        const motoristaVinculado = motoristas.find(m => m.veiculo?.placa === v.placa);
        return { ...v, motoristaNome: motoristaVinculado?.nome || '-' };
      })
      .sort((a, b) => b.viagens - a.viagens);
  }, [viagensFiltradas, motoristas]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(veiculosData.map(v => ({
      'Placa': v.placa,
      'Tipo': v.tipo,
      'Total Viagens': v.viagens,
      'Total PAX': v.pax,
      'Motorista Vinculado': v.motoristaNome,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Veículos');
    XLSX.writeFile(wb, 'auditoria_veiculos.xlsx');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Consolidação por Veículo</CardTitle>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Total Viagens</TableHead>
              <TableHead className="text-right">Total PAX</TableHead>
              <TableHead>Motorista Vinculado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veiculosData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell>
              </TableRow>
            ) : (
              veiculosData.map((v) => (
                <TableRow key={v.placa}>
                  <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                  <TableCell><Badge variant="outline">{v.tipo}</Badge></TableCell>
                  <TableCell className="text-right">{v.viagens}</TableCell>
                  <TableCell className="text-right">{v.pax}</TableCell>
                  <TableCell>{v.motoristaNome}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
