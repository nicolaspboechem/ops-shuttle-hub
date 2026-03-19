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
    let existingUser = false;

    // Validar login_type vs user_type (server-side enforcement)
    if (user_type === 'motorista' && login_type !== 'phone') {
      return new Response(
        JSON.stringify({ error: "Motoristas devem ser criados com login por telefone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (user_type && user_type !== 'motorista' && login_type === 'phone') {
      return new Response(
        JSON.stringify({ error: "Apenas motoristas podem usar login por telefone. Use e-mail para este tipo de usuário." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      
      // Verificar se o telefone já existe no auth.users
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError && existingUsers?.users) {
        const userWithPhone = existingUsers.users.find(u => u.phone === phoneFormatted);
        
        if (userWithPhone) {
          console.log(`Phone ${phoneFormatted} already exists for user ${userWithPhone.id}`);
          
          // Se evento_id foi fornecido, vincular o usuário existente ao evento
          if (evento_id) {
            // Verificar se já está vinculado
            const { data: existingLink } = await supabaseAdmin
              .from('evento_usuarios')
              .select('id')
              .eq('user_id', userWithPhone.id)
              .eq('evento_id', evento_id)
              .single();
            
            if (!existingLink) {
              const eventoRole = user_type === 'motorista' ? 'motorista' : 
                                 user_type === 'supervisor' ? 'supervisor' :
                                 user_type === 'cliente' ? 'cliente' : 'operador';
              
              await supabaseAdmin.from('evento_usuarios').insert({
                evento_id: evento_id,
                user_id: userWithPhone.id,
                role: eventoRole,
              });
              
              console.log(`Linked existing user ${userWithPhone.id} to event ${evento_id}`);
            }
            
            // Se motorista_id fornecido, vincular também
            if (motorista_id) {
              await supabaseAdmin
                .from('motoristas')
                .update({ user_id: userWithPhone.id })
                .eq('id', motorista_id);
              
              console.log(`Linked existing user ${userWithPhone.id} to motorista ${motorista_id}`);
            }
            
            return new Response(
              JSON.stringify({ 
                user: { id: userWithPhone.id }, 
                phone: phoneFormatted,
                user_type: user_type || 'operador',
                existing: true,
                message: 'Usuário existente vinculado ao evento'
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: "Este telefone já está cadastrado. Use outro número ou vincule o usuário existente ao evento." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
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
        
        // Mensagem de erro mais amigável
        if (error.code === 'phone_exists') {
          return new Response(
            JSON.stringify({ error: "Este telefone já está cadastrado no sistema." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newUserId = data.user.id;

      // Criar/atualizar profile com telefone e user_type (upsert para evitar conflito com trigger)
      await supabaseAdmin.from('profiles').upsert({
        user_id: newUserId,
        email: null,
        telefone: phoneFormatted,
        login_type: 'phone',
        full_name: full_name || telefone,
        user_type: user_type || 'operador',
      }, { onConflict: 'user_id' });
      
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

      // Criar/atualizar profile com email e user_type (upsert para evitar conflito com trigger)
      await supabaseAdmin.from('profiles').upsert({
        user_id: newUserId,
        email: email,
        telefone: null,
        login_type: 'email',
        full_name: full_name || email,
        user_type: user_type || 'operador',
      }, { onConflict: 'user_id' });
    }

    // Definir role baseado no tipo de usuário usando enum expandido
    const roleMap: Record<string, string> = {
      admin: 'admin',
      motorista: 'motorista',
      supervisor: 'supervisor',
      operador: 'operador',
      cliente: 'cliente',
    };
    const role = roleMap[user_type] || 'user';
    await supabaseAdmin.from('user_roles').upsert({
      user_id: newUserId,
      role: role,
    }, { onConflict: 'user_id' });


    // Se evento_id fornecido, vincular usuário ao evento
    if (evento_id) {
      const eventoRole = user_type === 'motorista' ? 'motorista' : 
                         user_type === 'supervisor' ? 'supervisor' :
                         user_type === 'cliente' ? 'cliente' : 'operador';
      
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
