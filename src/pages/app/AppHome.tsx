import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Evento } from '@/lib/types/viagem';
import { Bus, UserCircle, LogOut, Loader2 } from 'lucide-react';

export default function AppHome() {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchEventos();
  }, [user, navigate]);

  const fetchEventos = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .eq('status', 'ativo')
      .order('data_criacao', { ascending: false });
    
    setEventos(data || []);
    if (data && data.length === 1) {
      setSelectedEvento(data[0].id);
    }
    setLoading(false);
  };

  const handleCoordenador = () => {
    if (selectedEvento) {
      navigate(`/app/${selectedEvento}/coordenador`);
    }
  };

  const handleMotorista = () => {
    if (selectedEvento) {
      navigate(`/app/${selectedEvento}/motorista`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">App Campo</h1>
            <p className="text-sm text-muted-foreground">
              Olá, {profile?.full_name || user?.email}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Seletor de Evento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecione o Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEvento} onValueChange={setSelectedEvento}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um evento" />
              </SelectTrigger>
              <SelectContent>
                {eventos.map(evento => (
                  <SelectItem key={evento.id} value={evento.id}>
                    {evento.nome_planilha}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Botões de Acesso */}
        {selectedEvento && (
          <div className="grid gap-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={handleCoordenador}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCircle className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Coordenador</CardTitle>
                  <CardDescription>
                    Iniciar e controlar viagens do ponto
                  </CardDescription>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={handleMotorista}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Bus className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Motorista</CardTitle>
                  <CardDescription>
                    Registrar minhas viagens
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {eventos.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum evento ativo no momento
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
