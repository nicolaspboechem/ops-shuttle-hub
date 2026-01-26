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
        JSON.stringify({ error: "Apenas administradores podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      email, 
      telefone, 
      login_type, 
      password, 
      full_name, 
      user_type,
      evento_id,      // Optional: link to event
      motorista_id    // Optional: link to existing motorista record
    } = await req.json();

    let newUserId: string;
    let phoneFormatted: string | null = null;

    // Validar campos obrigatórios baseado no tipo de login
    if (login_type === 'phone') {
      if (!telefone || !password) {
        return new Response(
          JSON.stringify({ error: "Telefone e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Validar formato do telefone (mínimo 4 dígitos para evitar erros acidentais)
      const phoneDigits = telefone.replace(/\D/g, '');
      if (phoneDigits.length < 4) {
        return new Response(
          JSON.stringify({ error: "Telefone inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Formatar telefone para padrão internacional (+55...)
      phoneFormatted = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;
      
      // Criar usuário com telefone
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        phone: phoneFormatted,
        password,
        phone_confirm: true, // Confirma automaticamente sem SMS
        user_metadata: {
          full_name: full_name || telefone,
        },
      });

      if (error) {
        console.error("Error creating user with phone:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newUserId = data.user.id;

      // Criar profile com telefone e user_type
      await supabaseAdmin.from('profiles').insert({
        user_id: newUserId,
        email: null,
        telefone: phoneFormatted,
        login_type: 'phone',
        full_name: full_name || telefone,
        user_type: user_type || 'operador',
      });
      
    } else {
      // Login por email (comportamento original)
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar usuário via Admin API
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || email,
        },
      });

      if (error) {
        console.error("Error creating user:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newUserId = data.user.id;

      // Criar profile com email e user_type
      await supabaseAdmin.from('profiles').insert({
        user_id: newUserId,
        email: email,
        telefone: null,
        login_type: 'email',
        full_name: full_name || email,
        user_type: user_type || 'operador',
      });
    }

    // Definir role baseado no tipo de usuário
    const role = user_type === 'admin' ? 'admin' : 'user';
    await supabaseAdmin.from('user_roles').insert({
      user_id: newUserId,
      role: role,
    });

    // Definir permissões baseadas no tipo de usuário
    const permissionsToGrant: string[] = [];
    
    if (user_type === 'admin') {
      // Admin tem acesso total via role
    } else if (user_type === 'supervisor' || user_type === 'coordenador') {
      permissionsToGrant.push('view_trips', 'edit_trips', 'manage_drivers_vehicles', 'export_data');
    } else if (user_type === 'operador') {
      permissionsToGrant.push('view_trips', 'edit_trips', 'manage_drivers_vehicles', 'export_data');
    } else if (user_type === 'motorista') {
      permissionsToGrant.push('view_trips');
    }

    if (permissionsToGrant.length > 0) {
      const permissionInserts = permissionsToGrant.map(p => ({
        user_id: newUserId,
        permission: p,
        granted_by: callerUser.id,
      }));
      
      await supabaseAdmin.from('user_permissions').insert(permissionInserts);
    }

    // Se evento_id fornecido, vincular usuário ao evento
    if (evento_id) {
      const eventoRole = user_type === 'motorista' ? 'motorista' : 
                         user_type === 'supervisor' ? 'supervisor' :
                         user_type === 'coordenador' ? 'coordenador' : 'operador';
      
      await supabaseAdmin.from('evento_usuarios').insert({
        evento_id: evento_id,
        user_id: newUserId,
        role: eventoRole,
      });
      
      console.log(`Linked user ${newUserId} to event ${evento_id} with role ${eventoRole}`);
    }

    // Se motorista_id fornecido, atualizar registro do motorista com o user_id
    if (motorista_id) {
      const { error: motoristaError } = await supabaseAdmin
        .from('motoristas')
        .update({ user_id: newUserId })
        .eq('id', motorista_id);
      
      if (motoristaError) {
        console.error("Error linking user to motorista:", motoristaError);
      } else {
        console.log(`Linked user ${newUserId} to motorista ${motorista_id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        user: { id: newUserId }, 
        phone: phoneFormatted,
        user_type: user_type || 'operador'
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
