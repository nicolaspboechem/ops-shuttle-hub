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
    
    console.log('Driver login attempt:', { telefone });

    if (!telefone || !senha) {
      return new Response(
        JSON.stringify({ error: 'Telefone e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number - remove all non-digits
    const phoneDigits = telefone.replace(/\D/g, '');
    console.log('Phone digits:', phoneDigits);
    
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Service key exists:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Erro de configuração do servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    // Find credentials by phone (try with and without country code)
    const phonesToTry = [
      phoneDigits,
      phoneDigits.startsWith('55') ? phoneDigits.slice(2) : `55${phoneDigits}`,
      `+55${phoneDigits}`,
      `+${phoneDigits}`,
    ];
    
    console.log('Phones to try:', phonesToTry);

    let credencial = null;
    for (const phone of phonesToTry) {
      console.log('Trying phone:', phone);
      const { data, error } = await supabaseAdmin
        .from('motorista_credenciais')
        .select('*, motoristas(id, nome, evento_id, telefone)')
        .eq('telefone', phone)
        .eq('ativo', true)
        .maybeSingle();
      
      if (error) {
        console.error('Query error:', error);
      }
      
      if (data) {
        console.log('Found credentials for phone:', phone);
        credencial = data;
        break;
      }
    }

    if (!credencial) {
      console.log('No credentials found for any phone variation');
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Credentials found, verifying password...');
    console.log('Stored hash format:', credencial.senha_hash.substring(0, 20) + '...');

    // Verify password using our custom verifier
    const senhaValida = await verifyPassword(senha, credencial.senha_hash);
    console.log('Password valid:', senhaValida);
    
    if (!senhaValida) {
      console.log('Password verification failed');
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Password verified successfully');

    // Update last login
    await supabaseAdmin
      .from('motorista_credenciais')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', credencial.id);

    // Generate JWT
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

    const motorista = credencial.motoristas;
    const expiresAt = getNumericDate(60 * 60 * 24); // 24 hours

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        evento_id: motorista.evento_id,
        telefone: motorista.telefone,
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
          motorista_id: motorista.id,
          motorista_nome: motorista.nome,
          evento_id: motorista.evento_id,
          expires_at: expiresAt * 1000, // Convert to milliseconds
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Driver login error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
