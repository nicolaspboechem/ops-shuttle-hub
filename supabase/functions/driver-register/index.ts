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
    const { motorista_id, telefone, senha } = await req.json();

    if (!motorista_id || !telefone || !senha) {
      return new Response(
        JSON.stringify({ error: 'motorista_id, telefone e senha são obrigatórios' }),
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

    // Check if motorista exists
    const { data: motorista, error: motoristaError } = await supabaseAdmin
      .from('motoristas')
      .select('id, nome, evento_id, user_id')
      .eq('id', motorista_id)
      .maybeSingle();

    if (motoristaError || !motorista) {
      return new Response(
        JSON.stringify({ error: 'Motorista não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if phone already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.phone === phoneFormatted);

    let authUserId: string;

    if (existingUser) {
      // Phone already exists - update password and reuse
      authUserId = existingUser.id;
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
      // Create new auth user with phone
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: phoneFormatted,
        password: senha,
        phone_confirm: true,
        user_metadata: {
          full_name: motorista.nome,
          role: 'motorista',
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

    // Upsert role as 'motorista' in user_roles
    await supabaseAdmin.from('user_roles').upsert({
      user_id: authUserId,
      role: 'motorista',
    }, { onConflict: 'user_id' });

    // Upsert profile
    await supabaseAdmin.from('profiles').upsert({
      user_id: authUserId,
      full_name: motorista.nome,
      telefone: phoneFormatted,
      login_type: 'phone',
      user_type: 'motorista',
    }, { onConflict: 'user_id' });

    // Link motorista record to auth user
    await supabaseAdmin
      .from('motoristas')
      .update({ user_id: authUserId })
      .eq('id', motorista_id);

    // Link to event if motorista has evento_id
    if (motorista.evento_id) {
      const { data: existingLink } = await supabaseAdmin
        .from('evento_usuarios')
        .select('id')
        .eq('user_id', authUserId)
        .eq('evento_id', motorista.evento_id)
        .maybeSingle();

      if (!existingLink) {
        await supabaseAdmin.from('evento_usuarios').insert({
          evento_id: motorista.evento_id,
          user_id: authUserId,
          role: 'motorista',
        });
      }
    }

    // Also maintain motorista_credenciais as backup
    const { data: existingCred } = await supabaseAdmin
      .from('motorista_credenciais')
      .select('id')
      .eq('motorista_id', motorista_id)
      .maybeSingle();

    // Simple hash for backup table (not used for auth anymore)
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const data = encoder.encode(senha + saltHex);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const senhaHash = `$sha256$${saltHex}$${hashHex}`;

    if (existingCred) {
      await supabaseAdmin
        .from('motorista_credenciais')
        .update({ telefone: phoneDigits, senha_hash: senhaHash, ativo: true })
        .eq('id', existingCred.id);
    } else {
      await supabaseAdmin
        .from('motorista_credenciais')
        .insert({ motorista_id, telefone: phoneDigits, senha_hash: senhaHash, ativo: true });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser ? 'Credenciais atualizadas com sucesso' : 'Credenciais criadas com sucesso',
        motorista_nome: motorista.nome,
        auth_user_id: authUserId,
      }),
      { status: existingUser ? 200 : 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Driver register error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
