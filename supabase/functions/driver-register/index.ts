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

    // Normalize phone number - keep only digits
    const phoneDigits = telefone.replace(/\D/g, '');
    
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if motorista exists
    const { data: motorista, error: motoristaError } = await supabaseAdmin
      .from('motoristas')
      .select('id, nome')
      .eq('id', motorista_id)
      .maybeSingle();

    if (motoristaError || !motorista) {
      return new Response(
        JSON.stringify({ error: 'Motorista não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if credentials already exist for this motorista
    const { data: existingCred } = await supabaseAdmin
      .from('motorista_credenciais')
      .select('id')
      .eq('motorista_id', motorista_id)
      .maybeSingle();

    // Hash password using Edge-compatible method
    const senhaHash = await hashPassword(senha);

    if (existingCred) {
      // Update existing credentials - only update fields that exist
      const { error: updateError } = await supabaseAdmin
        .from('motorista_credenciais')
        .update({
          telefone: phoneDigits,
          senha_hash: senhaHash,
          ativo: true,
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
          motorista_nome: motorista.nome
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new credentials (same phone allowed for different motoristas/events)
    const { error: insertError } = await supabaseAdmin
      .from('motorista_credenciais')
      .insert({
        motorista_id,
        telefone: phoneDigits,
        senha_hash: senhaHash,
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
        motorista_nome: motorista.nome
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Driver register error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
