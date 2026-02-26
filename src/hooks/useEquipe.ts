import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type MotoristaRow = Database['public']['Tables']['motoristas']['Row'];
type MotoristaPresencaRow = Database['public']['Tables']['motorista_presenca']['Row'];
type EventoUsuarioRow = Database['public']['Tables']['evento_usuarios']['Row'];

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
  created_at: string;
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
      const [eventoRes, eventUsuariosRes, motoristasRes] = await Promise.all([
        supabase.from('eventos').select('horario_virada_dia').eq('id', eventoId).single(),
        supabase.from('evento_usuarios').select('*').eq('evento_id', eventoId),
        supabase.from('motoristas').select('*, veiculos!veiculo_id(placa)').eq('evento_id', eventoId),
      ]);

      if (eventUsuariosRes.error) throw eventUsuariosRes.error;
      if (motoristasRes.error) throw motoristasRes.error;

      const evento = eventoRes.data;
      const eventUsuarios = eventUsuariosRes.data || [];
      const motoristas = motoristasRes.data || [];

      const virada = evento?.horario_virada_dia || '04:00:00';
      setHorarioVirada(virada.substring(0, 5));

      const agora = getAgoraSync();
      const today = getDataOperacional(agora, virada.substring(0, 5));

      const staffUserIds = eventUsuarios.map(eu => eu.user_id);
      const motoristaIds = motoristas.map(m => m.id);

      const [profilesRes, presencaRes] = await Promise.all([
        staffUserIds.length > 0
          ? supabase.from('profiles').select('*').in('user_id', staffUserIds)
          : Promise.resolve({ data: [] as ProfileRow[], error: null }),
        motoristaIds.length > 0
          ? supabase.from('motorista_presenca').select('*').eq('evento_id', eventoId).eq('data', today).in('motorista_id', motoristaIds)
          : Promise.resolve({ data: [] as MotoristaPresencaRow[], error: null }),
      ]);

      const profiles = (profilesRes.data || []) as ProfileRow[];
      const presencas = (presencaRes.data || []) as MotoristaPresencaRow[];

      // Map staff members
      const staffMembros: EquipeMembro[] = ((eventUsuarios || []) as EventoUsuarioRow[])
        .filter(eu => eu.role !== 'motorista')
        .map(eu => {
          const profile = profiles.find(p => p.user_id === eu.user_id);
          return {
            id: eu.id,
            tipo: 'staff' as const,
            user_id: eu.user_id,
            nome: profile?.full_name || profile?.email || 'Sem nome',
            telefone: profile?.telefone || undefined,
            role: eu.role,
            created_at: eu.created_at || new Date().toISOString(),
          };
        });

      // Map motoristas
      const motoristaMembros: EquipeMembro[] = ((motoristas || []) as unknown as MotoristaWithVeiculo[]).map(m => {
        const presencasDoMotorista = presencas
          .filter(p => p.motorista_id === m.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const presenca = presencasDoMotorista.find(p => p.checkin_at && !p.checkout_at)
          || presencasDoMotorista[0] || null;
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

  const handleCheckin = async (motoristaId: string) => {
    if (!eventoId) return;
    const agora = getAgoraSync();
    const today = getDataOperacional(agora, horarioVirada);
    const now = agora.toISOString();

    try {
      const { data: existing } = await supabase
        .from('motorista_presenca')
        .select('id, checkout_at')
        .eq('motorista_id', motoristaId)
        .eq('evento_id', eventoId)
        .eq('data', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && !existing.checkout_at) {
        toast.info('Motorista já possui check-in ativo');
        return;
      }

      await supabase.from('motorista_presenca').insert({
        motorista_id: motoristaId,
        evento_id: eventoId,
        data: today,
        checkin_at: now,
      });

      await supabase.from('motoristas').update({ status: 'disponivel' }).eq('id', motoristaId);

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
        .not('checkin_at', 'is', null)
        .is('checkout_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        toast.error('Nenhum turno ativo encontrado para checkout');
        return;
      }

      const { data: motoristaAtual } = await supabase
        .from('motoristas')
        .select('veiculo_id, nome')
        .eq('id', motoristaId)
        .maybeSingle();

      const veiculoIdAtual = motoristaAtual?.veiculo_id;

      const ops = [
        supabase.from('motorista_presenca').update({ checkout_at: now }).eq('id', existing.id).then(),
        supabase.from('motoristas').update({ status: 'indisponivel', veiculo_id: null }).eq('id', motoristaId).then(),
        supabase.from('veiculos').update({ motorista_id: null }).eq('motorista_id', motoristaId).then(),
      ];

      if (veiculoIdAtual) {
        ops.push(
          supabase.from('veiculo_vistoria_historico').insert({
            veiculo_id: veiculoIdAtual,
            evento_id: eventoId,
            tipo_vistoria: 'desvinculacao',
            status_anterior: 'vinculado',
            status_novo: 'disponivel',
            motorista_id: motoristaId,
            motorista_nome: motoristaAtual?.nome || null,
            observacoes: 'Desvinculado via CCO (checkout)',
          }).then()
        );
      }

      await Promise.all(ops);
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

  const stats = useMemo(() => {
    const motoristas = membros.filter(m => m.tipo === 'motorista');
    const staff = membros.filter(m => m.tipo === 'staff');
    const operadores = staff.filter(m => m.role === 'operador');
    const supervisores = staff.filter(m => m.role === 'supervisor');
    const clientes = staff.filter(m => m.role === 'cliente');
    const motoristasPresentes = motoristas.filter(m => m.checkin_at && !m.checkout_at);

    return {
      total: membros.length,
      motoristas: motoristas.length,
      operadores: operadores.length,
      supervisores: supervisores.length,
      clientes: clientes.length,
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
