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

      // 1. Desvincular veículos (SET motorista_id = NULL)
      const { error: veiculoError, count: veiculosCount } = await supabaseAdmin
        .from('veiculos')
        .update({ motorista_id: null })
        .eq('motorista_id', motorista_id);
      
      if (veiculoError) {
        console.log('Error unlinking veiculos:', veiculoError.message);
      } else {
        console.log('Veiculos unlinked:', veiculosCount ?? 0);
      }

      // 2. Limpar referência nas vistorias (manter histórico, só remove FK)
      const { error: vistoriaError, count: vistoriasCount } = await supabaseAdmin
        .from('veiculo_vistoria_historico')
        .update({ motorista_id: null })
        .eq('motorista_id', motorista_id);
      
      if (vistoriaError) {
        console.log('Error unlinking vistorias:', vistoriaError.message);
      } else {
        console.log('Vistorias unlinked:', vistoriasCount ?? 0);
      }

      // 3. Limpar referência nas viagens (manter histórico, só remove FK)
      const { error: viagemError, count: viagensCount } = await supabaseAdmin
        .from('viagens')
        .update({ motorista_id: null })
        .eq('motorista_id', motorista_id);
      
      if (viagemError) {
        console.log('Error unlinking viagens:', viagemError.message);
      } else {
        console.log('Viagens unlinked:', viagensCount ?? 0);
      }

      // 4. Remove motorista credentials
      const { error: credError } = await supabaseAdmin
        .from('motorista_credenciais')
        .delete()
        .eq('motorista_id', motorista_id);
      
      if (credError) {
        console.log('Error deleting motorista_credenciais:', credError.message);
      } else {
        console.log('Motorista credenciais deleted');
      }

      // 5. Remove motorista presence records
      const { error: presError } = await supabaseAdmin
        .from('motorista_presenca')
        .delete()
        .eq('motorista_id', motorista_id);
      
      if (presError) {
        console.log('Error deleting motorista_presenca:', presError.message);
      } else {
        console.log('Motorista presenca deleted');
      }

      // 6. Remove motorista record (missoes e ponto_motoristas fazem CASCADE)
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
      } else {
        console.log('Motorista deleted successfully');
      }
    }

    // If we have a user_id (either passed or from motorista), clean up user-related records
    if (targetUserId) {
      // Remove staff credentials
      if (evento_id) {
        // Remove only for specific event
        await supabaseAdmin
          .from('staff_credenciais')
          .delete()
          .eq('user_id', targetUserId)
          .eq('evento_id', evento_id);
      } else {
        // Remove all credentials
        await supabaseAdmin
          .from('staff_credenciais')
          .delete()
          .eq('user_id', targetUserId);
      }

      // Remove from evento_usuarios
      if (evento_id) {
        await supabaseAdmin
          .from('evento_usuarios')
          .delete()
          .eq('user_id', targetUserId)
          .eq('evento_id', evento_id);
      } else {
        await supabaseAdmin
          .from('evento_usuarios')
          .delete()
          .eq('user_id', targetUserId);
      }

      // Only delete profile if removing from all events (no evento_id specified)
      if (!evento_id) {
        // Check if user has other event associations
        const { data: otherEvents } = await supabaseAdmin
          .from('evento_usuarios')
          .select('id')
          .eq('user_id', targetUserId)
          .limit(1);

        const { data: otherStaffCreds } = await supabaseAdmin
          .from('staff_credenciais')
          .select('id')
          .eq('user_id', targetUserId)
          .limit(1);

        // Only delete profile if no other associations exist
        if ((!otherEvents || otherEvents.length === 0) && (!otherStaffCreds || otherStaffCreds.length === 0)) {
          // Remove user roles and permissions
          await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', targetUserId);

          await supabaseAdmin
            .from('user_permissions')
            .delete()
            .eq('user_id', targetUserId);

          // Remove profile
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('user_id', targetUserId);

          // Try to delete from Supabase Auth (may fail if user was never in Auth)
          try {
            await supabaseAdmin.auth.admin.deleteUser(targetUserId);
          } catch (authDeleteError) {
            // User might not exist in Auth - that's okay for custom auth users
            console.log('User not in Auth or already deleted:', authDeleteError);
          }
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
