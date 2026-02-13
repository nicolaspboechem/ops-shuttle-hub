import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Database } from '@/integrations/supabase/types';

// Type definitions
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type MotoristaRow = Database['public']['Tables']['motoristas']['Row'];
type MotoristaPresencaRow = Database['public']['Tables']['motorista_presenca']['Row'];
type EventoUsuarioRow = Database['public']['Tables']['evento_usuarios']['Row'];

interface MotoristaCredencial {
  motorista_id: string;
  telefone: string;
  ativo: boolean | null;
}

interface StaffCredencial {
  user_id: string;
  telefone: string;
  ativo: boolean | null;
  role: string;
}

interface MotoristaWithVeiculo extends MotoristaRow {
  veiculos: { placa: string } | null;
}

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
  const [horarioVirada, setHorarioVirada] = useState('04:00');
  const { getAgoraSync } = useServerTime();

  const fetchEquipe = useCallback(async () => {
    if (!eventoId) return;
    
    setLoading(true);
    try {
      // BATCH 1: Fetch event settings + evento_usuarios + motoristas in parallel
      const [eventoRes, eventUsuariosRes, motoristasRes] = await Promise.all([
        supabase
          .from('eventos')
          .select('horario_virada_dia')
          .eq('id', eventoId)
          .single(),
        supabase
          .from('evento_usuarios')
          .select('*')
          .eq('evento_id', eventoId),
        supabase
          .from('motoristas')
          .select('*, veiculos!veiculo_id(placa)')
          .eq('evento_id', eventoId),
      ]);

      if (eventUsuariosRes.error) throw eventUsuariosRes.error;
      if (motoristasRes.error) throw motoristasRes.error;

      const evento = eventoRes.data;
      const eventUsuarios = eventUsuariosRes.data || [];
      const motoristas = motoristasRes.data || [];

      const virada = evento?.horario_virada_dia || '04:00:00';
      setHorarioVirada(virada.substring(0, 5));

      // Calculate data operacional with synced time
      const agora = getAgoraSync();
      const today = getDataOperacional(agora, virada.substring(0, 5));

      const staffUserIds = eventUsuarios.map(eu => eu.user_id);
      const motoristaIds = motoristas.map(m => m.id);

      // BATCH 2: Fetch all dependent data in parallel (was sequential!)
      const [profilesRes, credenciaisRes, presencaRes, staffCredRes] = await Promise.all([
        staffUserIds.length > 0
          ? supabase.from('profiles').select('*').in('user_id', staffUserIds)
          : Promise.resolve({ data: [] as ProfileRow[], error: null }),
        motoristaIds.length > 0
          ? supabase.from('motorista_credenciais').select('motorista_id, telefone, ativo').in('motorista_id', motoristaIds).eq('ativo', true)
          : Promise.resolve({ data: [] as MotoristaCredencial[], error: null }),
        motoristaIds.length > 0
          ? supabase.from('motorista_presenca').select('*').eq('evento_id', eventoId).eq('data', today).in('motorista_id', motoristaIds)
          : Promise.resolve({ data: [] as MotoristaPresencaRow[], error: null }),
        staffUserIds.length > 0
          ? supabase.from('staff_credenciais').select('user_id, telefone, ativo, role').in('user_id', staffUserIds).eq('evento_id', eventoId).eq('ativo', true)
          : Promise.resolve({ data: [] as StaffCredencial[], error: null }),
      ]);

      const profiles = (profilesRes.data || []) as ProfileRow[];
      const credenciais = (credenciaisRes.data || []) as MotoristaCredencial[];
      const presencas = (presencaRes.data || []) as MotoristaPresencaRow[];
      const staffCredenciais = (staffCredRes.data || []) as StaffCredencial[];

      // Map staff members (not motoristas)
      const staffMembros: EquipeMembro[] = ((eventUsuarios || []) as EventoUsuarioRow[])
        .filter(eu => eu.role !== 'motorista') // Staff only
        .map(eu => {
          const profile = profiles.find(p => p.user_id === eu.user_id);
          const staffCred = staffCredenciais.find(sc => sc.user_id === eu.user_id);
          return {
            id: eu.id,
            tipo: 'staff' as const,
            user_id: eu.user_id,
            nome: profile?.full_name || profile?.email || 'Sem nome',
            telefone: staffCred?.telefone || profile?.telefone || undefined,
            role: eu.role,
            has_login: !!staffCred, // Check staff_credenciais instead of always true
            created_at: eu.created_at || new Date().toISOString(),
          };
        });

      // Map motoristas - check has_login from motorista_credenciais
      const motoristaMembros: EquipeMembro[] = ((motoristas || []) as unknown as MotoristaWithVeiculo[]).map(m => {
        const presenca = presencas.find(p => p.motorista_id === m.id);
        const credencial = credenciais.find(c => c.motorista_id === m.id);
        return {
          id: m.id,
          tipo: 'motorista' as const,
          user_id: m.user_id || undefined,
          nome: m.nome,
          telefone: credencial?.telefone || m.telefone || undefined,
          role: 'motorista',
          status: m.status || 'disponivel',
          veiculo_id: m.veiculo_id || undefined,
          veiculo_placa: m.veiculos?.placa || undefined,
          has_login: !!credencial, // Check motorista_credenciais instead of user_id
          created_at: m.data_criacao,
          checkin_at: presenca?.checkin_at || null,
          checkout_at: presenca?.checkout_at || null,
        };
      });

      setMembros([...staffMembros, ...motoristaMembros]);
    } catch (error) {
      const err = error as Error;
      toast.error(`Erro ao carregar equipe: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [eventoId, getAgoraSync]);

  useEffect(() => {
    fetchEquipe();
  }, [fetchEquipe]);

  // Handlers for check-in/check-out
  const handleCheckin = async (motoristaId: string) => {
    if (!eventoId) return;
    
    const agora = getAgoraSync();
    const today = getDataOperacional(agora, horarioVirada);
    const now = agora.toISOString();

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
    } catch (error) {
      const err = error as Error;
      toast.error(`Erro no check-in: ${err.message}`);
    }
  };

  const handleCheckout = async (motoristaId: string) => {
    if (!eventoId) return;
    
    const agora = getAgoraSync();
    const today = getDataOperacional(agora, horarioVirada);
    const now = agora.toISOString();

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
    } catch (error) {
      const err = error as Error;
      toast.error(`Erro no check-out: ${err.message}`);
    }
  };

  const handleRemoveMembro = async (membro: EquipeMembro) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.access_token) {
        toast.error('Você precisa estar logado para remover membros');
        return;
      }

      const response = await supabase.functions.invoke('delete-user', {
        body: membro.tipo === 'motorista' 
          ? { motorista_id: membro.id, evento_id: eventoId }
          : { user_id: membro.user_id, evento_id: eventoId },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (response.error) {
        toast.error(`Erro ao remover: ${response.error.message}`);
        return;
      }

      toast.success('Membro removido da equipe');
      fetchEquipe();
    } catch (error) {
      const err = error as Error;
      toast.error(`Erro ao remover: ${err.message}`);
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
