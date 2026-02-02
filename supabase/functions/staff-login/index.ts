import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify password against stored hash (compatible with our custom format)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    
    const salt = parts[2];
    const expectedHash = parts[3];
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === expectedHash;
  }
  return false;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefone, senha } = await req.json();

    if (!telefone || !senha) {
      return new Response(
        JSON.stringify({ error: 'Telefone e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number - remove all non-digits
    const phoneDigits = telefone.replace(/\D/g, '');
    
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Find credentials by phone (try with and without country code)
    const phonesToTry = [
      phoneDigits,
      phoneDigits.startsWith('55') ? phoneDigits.slice(2) : `55${phoneDigits}`,
      `+55${phoneDigits}`,
      `+${phoneDigits}`,
    ];

    let credencial = null;
    for (const phone of phonesToTry) {
      const { data } = await supabaseAdmin
        .from('staff_credenciais')
        .select('*')
        .eq('telefone', phone)
        .eq('ativo', true)
        .maybeSingle();
      
      if (data) {
        // Fetch profile separately
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id, full_name, telefone')
          .eq('user_id', data.user_id)
          .maybeSingle();
        
        credencial = { ...data, profile };
        break;
      }
    }

    if (!credencial) {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password using our custom verifier
    const senhaValida = await verifyPassword(senha, credencial.senha_hash);
    
    if (!senhaValida) {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last login
    await supabaseAdmin
      .from('staff_credenciais')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', credencial.id);

    // Generate JWT - use same secret as drivers for simplicity
    const jwtSecret = Deno.env.get('DRIVER_JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const profile = credencial.profile;
    const expiresAt = getNumericDate(60 * 60 * 24); // 24 hours

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        user_id: credencial.user_id,
        user_nome: profile?.full_name || 'Staff',
        evento_id: credencial.evento_id,
        role: credencial.role,
        telefone: credencial.telefone,
        exp: expiresAt,
        iat: getNumericDate(0),
      },
      key
    );

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          token,
          user_id: credencial.user_id,
          user_nome: profile?.full_name || 'Staff',
          evento_id: credencial.evento_id,
          role: credencial.role,
          expires_at: expiresAt * 1000, // Convert to milliseconds
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff login error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
