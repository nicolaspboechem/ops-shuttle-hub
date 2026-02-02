import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge Runtime compatible password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return format: $sha256$salt$hash
  return `$sha256$${saltHex}$${hashHex}`;
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Normalize phone number - keep only digits
    const phoneDigits = telefone.replace(/\D/g, '');
    
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if profile exists, if not create it
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id,
          full_name: full_name || 'Staff',
          telefone: phoneDigits,
          user_type: role,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar perfil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if credentials already exist for this user+event
    const { data: existingCred } = await supabaseAdmin
      .from('staff_credenciais')
      .select('id')
      .eq('user_id', user_id)
      .eq('evento_id', evento_id)
      .maybeSingle();

    // Hash password using Edge-compatible method
    const senhaHash = await hashPassword(senha);

    if (existingCred) {
      // Update existing credentials
      const { error: updateError } = await supabaseAdmin
        .from('staff_credenciais')
        .update({
          telefone: phoneDigits,
          senha_hash: senhaHash,
          role,
          ativo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCred.id);

      if (updateError) {
        console.error('Error updating credentials:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar credenciais' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Credenciais atualizadas com sucesso',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if phone is already in use by another user in this event
    const { data: phoneExists } = await supabaseAdmin
      .from('staff_credenciais')
      .select('id')
      .eq('telefone', phoneDigits)
      .eq('evento_id', evento_id)
      .maybeSingle();

    if (phoneExists) {
      return new Response(
        JSON.stringify({ error: 'Este telefone já está em uso neste evento' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new credentials
    const { error: insertError } = await supabaseAdmin
      .from('staff_credenciais')
      .insert({
        user_id,
        evento_id,
        telefone: phoneDigits,
        senha_hash: senhaHash,
        role,
        ativo: true,
      });

    if (insertError) {
      console.error('Error creating credentials:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar credenciais' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credenciais criadas com sucesso',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff register error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
