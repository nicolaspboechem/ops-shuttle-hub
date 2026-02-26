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
    const { user_id, evento_id, telefone, senha, role, full_name } = await req.json();

    if (!user_id || !evento_id || !telefone || !senha || !role) {
      return new Response(
        JSON.stringify({ error: 'user_id, evento_id, telefone, senha e role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (senha.length < 4) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter no mínimo 4 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneDigits = telefone.replace(/\D/g, '');
    const phoneFormatted = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if phone already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.phone === phoneFormatted);

    let authUserId: string;

    if (existingAuthUser) {
      // Phone already exists - update password
      authUserId = existingAuthUser.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: senha,
      });
      if (updateError) {
        console.error('Error updating auth user:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar credenciais' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: phoneFormatted,
        password: senha,
        phone_confirm: true,
        user_metadata: {
          full_name: full_name || 'Staff',
          role: role,
        },
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authUserId = newUser.user.id;
    }

    // Map role to app_role enum value
    const roleMap: Record<string, string> = {
      supervisor: 'supervisor',
      operador: 'operador',
      cliente: 'cliente',
    };
    const appRole = roleMap[role] || 'operador';

    // Upsert role in user_roles
    await supabaseAdmin.from('user_roles').upsert({
      user_id: authUserId,
      role: appRole,
    }, { onConflict: 'user_id' });

    // Upsert profile
    await supabaseAdmin.from('profiles').upsert({
      user_id: authUserId,
      full_name: full_name || 'Staff',
      telefone: phoneFormatted,
      login_type: 'phone',
      user_type: role,
    }, { onConflict: 'user_id' });

    // Link to event
    const { data: existingLink } = await supabaseAdmin
      .from('evento_usuarios')
      .select('id')
      .eq('user_id', authUserId)
      .eq('evento_id', evento_id)
      .maybeSingle();

    if (!existingLink) {
      await supabaseAdmin.from('evento_usuarios').insert({
        evento_id,
        user_id: authUserId,
        role: role,
      });
    }

    // Also maintain staff_credenciais as backup
    const { data: existingCred } = await supabaseAdmin
      .from('staff_credenciais')
      .select('id')
      .eq('user_id', user_id)
      .eq('evento_id', evento_id)
      .maybeSingle();

    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const data = encoder.encode(senha + saltHex);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const senhaHash = `$sha256$${saltHex}$${hashHex}`;

    if (existingCred) {
      await supabaseAdmin
        .from('staff_credenciais')
        .update({ telefone: phoneDigits, senha_hash: senhaHash, role, ativo: true, updated_at: new Date().toISOString() })
        .eq('id', existingCred.id);
    } else {
      await supabaseAdmin
        .from('staff_credenciais')
        .insert({ user_id, evento_id, telefone: phoneDigits, senha_hash: senhaHash, role, ativo: true });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingAuthUser ? 'Credenciais atualizadas com sucesso' : 'Credenciais criadas com sucesso',
        auth_user_id: authUserId,
      }),
      { status: existingAuthUser ? 200 : 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff register error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
