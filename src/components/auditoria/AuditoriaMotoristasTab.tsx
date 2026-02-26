import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Viagem } from '@/lib/types/viagem';
import * as XLSX from 'xlsx';

interface Props {
  viagensFiltradas: Viagem[];
}

export function AuditoriaMotoristasTab({ viagensFiltradas }: Props) {
  const motoristasData = useMemo(() => {
    const map = new Map<string, { nome: string; viagens: number; pax: number }>();
    viagensFiltradas.forEach(v => {
      const nome = v.motorista || 'Não informado';
      const existing = map.get(nome) || { nome, viagens: 0, pax: 0 };
      existing.viagens += 1;
      existing.pax += (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0);
      map.set(nome, existing);
    });
    return Array.from(map.values())
      .map(m => ({ ...m, mediaPax: m.viagens > 0 ? (m.pax / m.viagens).toFixed(1) : '0' }))
      .sort((a, b) => b.viagens - a.viagens);
  }, [viagensFiltradas]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(motoristasData.map(m => ({
      'Motorista': m.nome,
      'Total Viagens': m.viagens,
      'Total PAX': m.pax,
      'Média PAX/Viagem': m.mediaPax,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Motoristas');
    XLSX.writeFile(wb, 'auditoria_motoristas.xlsx');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Consolidação por Motorista</CardTitle>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motorista</TableHead>
              <TableHead className="text-right">Total Viagens</TableHead>
              <TableHead className="text-right">Total PAX</TableHead>
              <TableHead className="text-right">Média PAX/Viagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motoristasData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell>
              </TableRow>
            ) : (
              motoristasData.map((m) => (
                <TableRow key={m.nome}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-right">{m.viagens}</TableCell>
                  <TableCell className="text-right">{m.pax}</TableCell>
                  <TableCell className="text-right">{m.mediaPax}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
