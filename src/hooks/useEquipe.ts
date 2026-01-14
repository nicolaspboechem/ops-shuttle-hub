import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipeMembro {
  id: string;
  tipo: 'staff' | 'motorista';
  user_id?: string;
  nome: string;
  telefone?: string;
  role: string;
  status?: string;
  veiculo_id?: string;
  veiculo_placa?: string;
  has_login: boolean;
  created_at: string;
  // Presença
  checkin_at?: string | null;
  checkout_at?: string | null;
}

export function useEquipe(eventoId?: string) {
  const [membros, setMembros] = useState<EquipeMembro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipe = async () => {
    if (!eventoId) return;
    
    setLoading(true);
    try {
      // Fetch evento_usuarios (staff: operadores, supervisores)
      const { data: eventUsuarios, error: euError } = await supabase
        .from('evento_usuarios')
        .select('*')
        .eq('evento_id', eventoId);

      if (euError) throw euError;

      // Fetch profiles for staff members
      const staffUserIds = (eventUsuarios || []).map(eu => eu.user_id);
      let profiles: any[] = [];
      if (staffUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, telefone')
          .in('user_id', staffUserIds);
        profiles = profilesData || [];
      }

      // Fetch motoristas for this event
      // Especificar FK explícita para evitar ambiguidade no relacionamento bidirecional
      const { data: motoristas, error: motError } = await supabase
        .from('motoristas')
        .select('*, veiculos!veiculo_id(placa)')
        .eq('evento_id', eventoId);

      if (motError) throw motError;

      // Fetch today's presença
      const today = new Date().toISOString().split('T')[0];
      const motoristaIds = (motoristas || []).map(m => m.id);
      let presencas: any[] = [];
      if (motoristaIds.length > 0) {
        const { data: presencaData } = await supabase
          .from('motorista_presenca')
          .select('*')
          .eq('evento_id', eventoId)
          .eq('data', today)
          .in('motorista_id', motoristaIds);
        presencas = presencaData || [];
      }

      // Map staff members (not motoristas)
      const staffMembros: EquipeMembro[] = (eventUsuarios || [])
        .filter(eu => eu.role !== 'motorista') // Staff only
        .map(eu => {
          const profile = profiles.find(p => p.user_id === eu.user_id);
          return {
            id: eu.id,
            tipo: 'staff' as const,
            user_id: eu.user_id,
            nome: profile?.full_name || profile?.email || 'Sem nome',
            telefone: profile?.telefone || undefined,
            role: eu.role,
            has_login: true,
            created_at: eu.created_at,
          };
        });

      // Map motoristas
      const motoristaMembros: EquipeMembro[] = (motoristas || []).map(m => {
        const presenca = presencas.find(p => p.motorista_id === m.id);
        return {
          id: m.id,
          tipo: 'motorista' as const,
          user_id: m.user_id || undefined,
          nome: m.nome,
          telefone: m.telefone || undefined,
          role: 'motorista',
          status: m.status || 'disponivel',
          veiculo_id: m.veiculo_id || undefined,
          veiculo_placa: m.veiculos?.placa || undefined,
          has_login: !!m.user_id,
          created_at: m.data_criacao,
          checkin_at: presenca?.checkin_at || null,
          checkout_at: presenca?.checkout_at || null,
        };
      });

      setMembros([...staffMembros, ...motoristaMembros]);
    } catch (error: any) {
      toast.error(`Erro ao carregar equipe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipe();
  }, [eventoId]);

  // Handlers for check-in/check-out
  const handleCheckin = async (motoristaId: string) => {
    if (!eventoId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      // Check if there's already a record for today
      const { data: existing } = await supabase
        .from('motorista_presenca')
        .select('id')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', today)
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from('motorista_presenca')
          .update({ checkin_at: now, checkout_at: null })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await supabase
          .from('motorista_presenca')
          .insert({
            motorista_id: motoristaId,
            evento_id: eventoId,
            data: today,
            checkin_at: now,
          });
      }

      // Update motorista status to disponivel
      await supabase
        .from('motoristas')
        .update({ status: 'disponivel' })
        .eq('id', motoristaId);

      toast.success('Check-in realizado!');
      fetchEquipe();
    } catch (error: any) {
      toast.error(`Erro no check-in: ${error.message}`);
    }
  };

  const handleCheckout = async (motoristaId: string) => {
    if (!eventoId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      const { data: existing } = await supabase
        .from('motorista_presenca')
        .select('id')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', today)
        .single();

      if (existing) {
        await supabase
          .from('motorista_presenca')
          .update({ checkout_at: now })
          .eq('id', existing.id);
      }

      // Update motorista status to indisponivel
      await supabase
        .from('motoristas')
        .update({ status: 'indisponivel' })
        .eq('id', motoristaId);

      toast.success('Check-out realizado!');
      fetchEquipe();
    } catch (error: any) {
      toast.error(`Erro no check-out: ${error.message}`);
    }
  };

  const handleRemoveMembro = async (membro: EquipeMembro) => {
    try {
      if (membro.tipo === 'staff') {
        await supabase
          .from('evento_usuarios')
          .delete()
          .eq('id', membro.id);
      } else {
        await supabase
          .from('motoristas')
          .delete()
          .eq('id', membro.id);
      }
      toast.success('Membro removido da equipe');
      fetchEquipe();
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const motoristas = membros.filter(m => m.tipo === 'motorista');
    const staff = membros.filter(m => m.tipo === 'staff');
    const operadores = staff.filter(m => m.role === 'operador');
    const supervisores = staff.filter(m => m.role === 'supervisor');
    const motoristasComLogin = motoristas.filter(m => m.has_login);
    const motoristasPresentes = motoristas.filter(m => m.checkin_at && !m.checkout_at);

    return {
      total: membros.length,
      motoristas: motoristas.length,
      operadores: operadores.length,
      supervisores: supervisores.length,
      motoristasComLogin: motoristasComLogin.length,
      motoristasPresentes: motoristasPresentes.length,
    };
  }, [membros]);

  return {
    membros,
    loading,
    stats,
    refetch: fetchEquipe,
    handleCheckin,
    handleCheckout,
    handleRemoveMembro,
  };
}
