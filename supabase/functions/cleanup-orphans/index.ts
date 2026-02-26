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
        JSON.stringify({ error: "Apenas administradores podem executar limpeza" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      orphan_profiles_deleted: 0,
      orphan_evento_usuarios_deleted: 0,
      orphan_user_roles_deleted: 0,
      orphan_user_permissions_deleted: 0,
      orphan_auth_users_deleted: 0,
      profiles_created_for_auth_users: 0,
      errors: [] as string[],
    };

    // 1. Get all auth users
    const allAuthUserIds = new Set<string>();
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        results.errors.push(`Error listing auth users page ${page}: ${error.message}`);
        break;
      }
      if (!users || users.length === 0) break;
      users.forEach(u => allAuthUserIds.add(u.id));
      if (users.length < perPage) break;
      page++;
    }

    console.log(`Found ${allAuthUserIds.size} auth users`);

    // 2. Find and delete orphan profiles (no auth.users match)
    const { data: allProfiles } = await supabaseAdmin.from('profiles').select('user_id, email, full_name');
    if (allProfiles) {
      const orphanProfiles = allProfiles.filter(p => !allAuthUserIds.has(p.user_id));
      for (const orphan of orphanProfiles) {
        console.log(`Deleting orphan profile: ${orphan.full_name} (${orphan.user_id})`);
        
        // Nullify FK references first
        await supabaseAdmin.from('veiculo_vistoria_historico').update({ realizado_por: null }).eq('realizado_por', orphan.user_id);
        await supabaseAdmin.from('veiculos').update({ atualizado_por: null }).eq('atualizado_por', orphan.user_id);
        await supabaseAdmin.from('veiculos').update({ criado_por: null }).eq('criado_por', orphan.user_id);
        await supabaseAdmin.from('veiculos').update({ inspecao_por: null }).eq('inspecao_por', orphan.user_id);
        await supabaseAdmin.from('veiculos').update({ liberado_por: null }).eq('liberado_por', orphan.user_id);
        
        // Delete related records
        await supabaseAdmin.from('evento_usuarios').delete().eq('user_id', orphan.user_id);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', orphan.user_id);
        await supabaseAdmin.from('user_permissions').delete().eq('user_id', orphan.user_id);
        
        const { error } = await supabaseAdmin.from('profiles').delete().eq('user_id', orphan.user_id);
        if (error) {
          results.errors.push(`Failed to delete profile ${orphan.user_id}: ${error.message}`);
        } else {
          results.orphan_profiles_deleted++;
        }
      }
    }

    // 3. Find and delete orphan evento_usuarios
    const { data: allEventoUsuarios } = await supabaseAdmin.from('evento_usuarios').select('id, user_id');
    if (allEventoUsuarios) {
      const orphanEU = allEventoUsuarios.filter(eu => !allAuthUserIds.has(eu.user_id));
      for (const orphan of orphanEU) {
        const { error } = await supabaseAdmin.from('evento_usuarios').delete().eq('id', orphan.id);
        if (!error) results.orphan_evento_usuarios_deleted++;
        else results.errors.push(`Failed to delete evento_usuario ${orphan.id}: ${error.message}`);
      }
    }

    // 4. Find and delete orphan user_roles
    const { data: allRoles } = await supabaseAdmin.from('user_roles').select('id, user_id');
    if (allRoles) {
      const orphanRoles = allRoles.filter(r => !allAuthUserIds.has(r.user_id));
      for (const orphan of orphanRoles) {
        const { error } = await supabaseAdmin.from('user_roles').delete().eq('id', orphan.id);
        if (!error) results.orphan_user_roles_deleted++;
        else results.errors.push(`Failed to delete user_role ${orphan.id}: ${error.message}`);
      }
    }

    // 5. Find and delete orphan user_permissions
    const { data: allPerms } = await supabaseAdmin.from('user_permissions').select('id, user_id');
    if (allPerms) {
      const orphanPerms = allPerms.filter(p => !allAuthUserIds.has(p.user_id));
      for (const orphan of orphanPerms) {
        const { error } = await supabaseAdmin.from('user_permissions').delete().eq('id', orphan.id);
        if (!error) results.orphan_user_permissions_deleted++;
        else results.errors.push(`Failed to delete user_permission ${orphan.id}: ${error.message}`);
      }
    }

    // 6. Find auth users without profiles and create profiles
    const profileUserIds = new Set((allProfiles || []).map(p => p.user_id));
    // Re-check after deletions
    const { data: remainingProfiles } = await supabaseAdmin.from('profiles').select('user_id');
    const remainingProfileIds = new Set((remainingProfiles || []).map(p => p.user_id));
    
    for (const authUserId of allAuthUserIds) {
      if (!remainingProfileIds.has(authUserId)) {
        // Get user info from auth
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(authUserId);
        if (user) {
          const { error } = await supabaseAdmin.from('profiles').insert({
            user_id: authUserId,
            email: user.email || null,
            full_name: user.user_metadata?.full_name || user.user_metadata?.nome || null,
            telefone: user.phone || null,
          });
          if (!error) {
            results.profiles_created_for_auth_users++;
            console.log(`Created profile for auth user: ${user.email || user.phone}`);
          } else {
            results.errors.push(`Failed to create profile for ${authUserId}: ${error.message}`);
          }
        }
      }
    }

    console.log('Cleanup results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cleanup-orphans:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
