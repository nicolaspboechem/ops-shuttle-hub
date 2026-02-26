import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: callerUser.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem executar a migração' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const report: {
      motoristas: { nome: string; telefone: string; senha_temp: string; auth_user_id: string; status: string }[];
      staff: { nome: string; telefone: string; role: string; senha_temp: string; auth_user_id: string; status: string }[];
      errors: string[];
    } = { motoristas: [], staff: [], errors: [] };

    // Get all existing auth users to check for phone conflicts
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingPhones = new Map<string, string>();
    if (authUsersData?.users) {
      for (const u of authUsersData.users) {
        if (u.phone) existingPhones.set(u.phone, u.id);
      }
    }

    // --- MIGRATE MOTORISTAS ---
    const { data: motoristaCreds } = await supabaseAdmin
      .from('motorista_credenciais')
      .select('*, motoristas!motorista_credenciais_motorista_id_fkey(id, nome, evento_id, user_id)')
      .eq('ativo', true);

    for (const cred of motoristaCreds || []) {
      try {
        const motorista = (cred as any).motoristas;
        if (!motorista) {
          report.errors.push(`Motorista not found for cred ${cred.id}`);
          continue;
        }

        const phoneDigits = cred.telefone.replace(/\D/g, '');
        const phoneFormatted = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;
        const last4 = phoneDigits.slice(-4);
        const senhaTemp = `As@${last4}`;

        // Check if already migrated (motorista has user_id and that user exists in auth)
        if (motorista.user_id && existingPhones.has(phoneFormatted)) {
          report.motoristas.push({
            nome: motorista.nome,
            telefone: phoneFormatted,
            senha_temp: '(já migrado)',
            auth_user_id: motorista.user_id,
            status: 'skipped',
          });
          continue;
        }

        let authUserId: string;
        const existingAuthId = existingPhones.get(phoneFormatted);

        if (existingAuthId) {
          // Phone exists - update password
          authUserId = existingAuthId;
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: senhaTemp });
        } else {
          // Create new auth user
          const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            phone: phoneFormatted,
            password: senhaTemp,
            phone_confirm: true,
            user_metadata: { full_name: motorista.nome, role: 'motorista' },
          });

          if (createErr) {
            report.errors.push(`Motorista ${motorista.nome} (${phoneFormatted}): ${createErr.message}`);
            continue;
          }
          authUserId = newUser.user.id;
          existingPhones.set(phoneFormatted, authUserId);
        }

        // Upsert role
        await supabaseAdmin.from('user_roles').upsert(
          { user_id: authUserId, role: 'motorista' },
          { onConflict: 'user_id' }
        );

        // Upsert profile
        await supabaseAdmin.from('profiles').upsert(
          { user_id: authUserId, full_name: motorista.nome, telefone: phoneFormatted, login_type: 'phone', user_type: 'motorista' },
          { onConflict: 'user_id' }
        );

        // Link motorista record
        await supabaseAdmin.from('motoristas').update({ user_id: authUserId }).eq('id', motorista.id);

        // Link to event
        if (motorista.evento_id) {
          const { data: existing } = await supabaseAdmin
            .from('evento_usuarios')
            .select('id')
            .eq('user_id', authUserId)
            .eq('evento_id', motorista.evento_id)
            .maybeSingle();

          if (!existing) {
            await supabaseAdmin.from('evento_usuarios').insert({
              evento_id: motorista.evento_id,
              user_id: authUserId,
              role: 'motorista',
            });
          }
        }

        report.motoristas.push({
          nome: motorista.nome,
          telefone: phoneFormatted,
          senha_temp: senhaTemp,
          auth_user_id: authUserId,
          status: existingAuthId ? 'updated' : 'created',
        });

      } catch (e) {
        report.errors.push(`Motorista cred ${cred.id}: ${e.message}`);
      }
    }

    // --- MIGRATE STAFF ---
    const { data: staffCreds } = await supabaseAdmin
      .from('staff_credenciais')
      .select('*, profiles!staff_credenciais_user_id_fkey(user_id, full_name)')
      .eq('ativo', true);

    // staff_credenciais doesn't have FK to profiles, so fetch profiles separately
    const staffCredsRaw = await supabaseAdmin
      .from('staff_credenciais')
      .select('*')
      .eq('ativo', true);

    for (const cred of staffCredsRaw.data || []) {
      try {
        // Get profile info
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('user_id', cred.user_id)
          .maybeSingle();

        const fullName = profile?.full_name || 'Staff';
        const phoneDigits = cred.telefone.replace(/\D/g, '');
        const phoneFormatted = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;
        const last4 = phoneDigits.slice(-4);
        const senhaTemp = `As@${last4}`;

        let authUserId: string;
        const existingAuthId = existingPhones.get(phoneFormatted);

        if (existingAuthId) {
          authUserId = existingAuthId;
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: senhaTemp });
        } else {
          const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            phone: phoneFormatted,
            password: senhaTemp,
            phone_confirm: true,
            user_metadata: { full_name: fullName, role: cred.role },
          });

          if (createErr) {
            report.errors.push(`Staff ${fullName} (${phoneFormatted}): ${createErr.message}`);
            continue;
          }
          authUserId = newUser.user.id;
          existingPhones.set(phoneFormatted, authUserId);
        }

        // Map role
        const roleMap: Record<string, string> = {
          supervisor: 'supervisor',
          operador: 'operador',
          cliente: 'cliente',
        };
        const appRole = roleMap[cred.role] || 'operador';

        // Upsert role
        await supabaseAdmin.from('user_roles').upsert(
          { user_id: authUserId, role: appRole },
          { onConflict: 'user_id' }
        );

        // Upsert profile
        await supabaseAdmin.from('profiles').upsert(
          { user_id: authUserId, full_name: fullName, telefone: phoneFormatted, login_type: 'phone', user_type: cred.role },
          { onConflict: 'user_id' }
        );

        // Link to event
        const { data: existing } = await supabaseAdmin
          .from('evento_usuarios')
          .select('id')
          .eq('user_id', authUserId)
          .eq('evento_id', cred.evento_id)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from('evento_usuarios').insert({
            evento_id: cred.evento_id,
            user_id: authUserId,
            role: cred.role,
          });
        }

        report.staff.push({
          nome: fullName,
          telefone: phoneFormatted,
          role: cred.role,
          senha_temp: senhaTemp,
          auth_user_id: authUserId,
          status: existingAuthId ? 'updated' : 'created',
        });

      } catch (e) {
        report.errors.push(`Staff cred ${cred.id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          motoristas_migrated: report.motoristas.filter(m => m.status !== 'skipped').length,
          motoristas_skipped: report.motoristas.filter(m => m.status === 'skipped').length,
          staff_migrated: report.staff.filter(s => s.status !== 'skipped').length,
          errors: report.errors.length,
        },
        report,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
