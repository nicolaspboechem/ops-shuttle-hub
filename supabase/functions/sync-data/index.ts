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
    // Auth check: require admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Obter hora atual sincronizada do banco de dados
    const { data: serverTimeData, error: timeError } = await supabase.rpc('get_server_time');
    if (timeError) {
      console.warn('[sync-data] Erro ao obter hora do servidor, usando fallback:', timeError);
    }
    const spTime = serverTimeData ? new Date(serverTimeData) : new Date();
    
    console.log(`[sync-data] Executando sincronização às ${spTime.toISOString()}`);

    // Atualizar estatísticas de todos os eventos ativos
    const { data: eventos, error: eventosError } = await supabase
      .from('eventos')
      .select('id')
      .eq('status', 'ativo');

    if (eventosError) {
      throw eventosError;
    }

    let updated = 0;
    for (const evento of eventos || []) {
      // Calcular estatísticas do evento
      const { data: stats } = await supabase
        .from('viagens')
        .select('data_criacao')
        .eq('evento_id', evento.id);

      if (stats && stats.length > 0) {
        const datas = stats.map(s => new Date(s.data_criacao).toISOString().split('T')[0]);
        const dataInicio = datas.sort()[0];
        const dataFim = datas.sort().reverse()[0];

        await supabase
          .from('eventos')
          .update({
            total_viagens: stats.length,
            data_inicio: dataInicio,
            data_fim: dataFim,
            data_ultima_sync: new Date().toISOString()
          })
          .eq('id', evento.id);

        updated++;
      }
    }

    console.log(`[sync-data] ${updated} eventos atualizados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sincronização concluída. ${updated} eventos atualizados.`,
        timestamp: spTime.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[sync-data] Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
