import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação do chamador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorização necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar se o usuário chamador é admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o usuário é admin usando a função is_admin
    const { data: isAdminResult, error: adminCheckError } = await supabaseAdmin
      .rpc('is_admin', { _user_id: callerUser.id });

    if (adminCheckError) {
      console.error("Admin check error:", adminCheckError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdminResult) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem alterar telefone de usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, new_phone } = await req.json();

    if (!user_id || !new_phone) {
      return new Response(
        JSON.stringify({ error: "user_id e new_phone são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar formato do telefone (mínimo 4 dígitos)
    const phoneDigits = new_phone.replace(/\D/g, '');
    if (phoneDigits.length < 4) {
      return new Response(
        JSON.stringify({ error: "Telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar telefone para padrão internacional (+55...)
    const phoneFormatted = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;

    // Atualizar telefone no auth.users via Admin API
    const { data: updatedUser, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { phone: phoneFormatted }
    );

    if (updateAuthError) {
      console.error("Error updating auth user phone:", updateAuthError);
      return new Response(
        JSON.stringify({ error: updateAuthError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar telefone no profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ telefone: phoneFormatted, updated_at: new Date().toISOString() })
      .eq('user_id', user_id);

    if (profileError) {
      console.error("Error updating profile phone:", profileError);
      // Não retornar erro pois o auth já foi atualizado
    }

    console.log(`Phone updated for user ${user_id}: ${phoneFormatted}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        phone: phoneFormatted
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
