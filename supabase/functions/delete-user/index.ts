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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdminResult } = await supabaseAdmin.rpc('is_admin', { _user_id: callerUser.id });
    
    if (!isAdminResult) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, motorista_id, evento_id } = await req.json();

    if (!user_id && !motorista_id) {
      return new Response(
        JSON.stringify({ error: "user_id ou motorista_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUserId = user_id;

    // If motorista_id provided, handle motorista deletion
    if (motorista_id) {
      console.log('Starting motorista deletion for:', motorista_id);
      
      // Get motorista to find user_id
      const { data: motorista } = await supabaseAdmin
        .from('motoristas')
        .select('user_id')
        .eq('id', motorista_id)
        .single();
      
      if (motorista?.user_id) {
        targetUserId = motorista.user_id;
      }

      // 1. Desvincular veículos
      await supabaseAdmin
        .from('veiculos')
        .update({ motorista_id: null })
        .eq('motorista_id', motorista_id);

      // 2. Limpar referência nas vistorias
      await supabaseAdmin
        .from('veiculo_vistoria_historico')
        .update({ motorista_id: null })
        .eq('motorista_id', motorista_id);

      // 3. Limpar referência nas viagens
      await supabaseAdmin
        .from('viagens')
        .update({ motorista_id: null })
        .eq('motorista_id', motorista_id);

      // 4. Remove motorista presence records
      await supabaseAdmin
        .from('motorista_presenca')
        .delete()
        .eq('motorista_id', motorista_id);

      // 5. Remove motorista record (missoes e ponto_motoristas fazem CASCADE)
      const { error: motError } = await supabaseAdmin
        .from('motoristas')
        .delete()
        .eq('id', motorista_id);
      
      if (motError) {
        console.log('Error deleting motorista:', motError.message);
        return new Response(
          JSON.stringify({ error: `Erro ao deletar motorista: ${motError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log('Motorista deleted successfully');
    }

    // Clean up user-related records
    if (targetUserId) {
      if (evento_id) {
        // Remove only from specific event
        await supabaseAdmin
          .from('evento_usuarios')
          .delete()
          .eq('user_id', targetUserId)
          .eq('evento_id', evento_id);
      } else {
        // FULL deletion - no conditional checks
        console.log('Full user deletion for:', targetUserId);

        // 1. Nullify FK refs in veiculo_vistoria_historico
        await supabaseAdmin
          .from('veiculo_vistoria_historico')
          .update({ realizado_por: null })
          .eq('realizado_por', targetUserId);

        // 2. Nullify FK refs in veiculos
        await supabaseAdmin
          .from('veiculos')
          .update({ atualizado_por: null })
          .eq('atualizado_por', targetUserId);

        await supabaseAdmin
          .from('veiculos')
          .update({ criado_por: null })
          .eq('criado_por', targetUserId);

        await supabaseAdmin
          .from('veiculos')
          .update({ inspecao_por: null })
          .eq('inspecao_por', targetUserId);

        await supabaseAdmin
          .from('veiculos')
          .update({ liberado_por: null })
          .eq('liberado_por', targetUserId);

        // 3. Remove all evento_usuarios
        await supabaseAdmin
          .from('evento_usuarios')
          .delete()
          .eq('user_id', targetUserId);

        // 4. Remove user roles and permissions
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId);


        // 5. Remove profile
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', targetUserId);

        // 6. Delete from Supabase Auth
        try {
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
          if (authDeleteError) {
            console.log('Auth delete error (non-fatal):', authDeleteError.message);
          } else {
            console.log('Auth user deleted successfully');
          }
        } catch (e) {
          console.log('Auth user not found or already deleted:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Usuário excluído com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in delete-user:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
