import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get server time in São Paulo timezone
    const { data: serverTimeStr } = await supabase.rpc("get_server_time");
    const serverTime = new Date(serverTimeStr);
    const horaAtual = serverTime.getHours();
    const minAtual = serverTime.getMinutes();
    const atualMinutos = horaAtual * 60 + minAtual;

    // Fetch ALL active events (removed habilitar_missoes filter)
    const { data: eventos, error: eventosError } = await supabase
      .from("eventos")
      .select("id, horario_virada_dia, nome_planilha")
      .eq("status", "ativo");

    if (eventosError) throw eventosError;
    if (!eventos || eventos.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active events" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalCheckouts = 0;
    let totalViagensFechadas = 0;
    let totalMissoesCanceladas = 0;
    const results: { evento: string; checkouts: number; viagensFechadas: number; missoesCanceladas: number }[] = [];

    for (const evento of eventos) {
      const virada = evento.horario_virada_dia || "04:00:00";
      const [horaVirada, minVirada] = virada.split(":").map(Number);
      const viradaMinutos = horaVirada * 60 + (minVirada || 0);

      // Only act within a 15-minute window after the turnover time
      const diffMinutos = atualMinutos - viradaMinutos;
      const adjustedDiff = diffMinutos < -720 ? diffMinutos + 1440 : diffMinutos;

      if (adjustedDiff < 0 || adjustedDiff >= 15) {
        continue; // Not in the window
      }

      // Calculate yesterday's operational date
      const yesterday = new Date(serverTime);
      yesterday.setDate(yesterday.getDate() - 1);
      const dataOntem = yesterday.toISOString().slice(0, 10);

      // Calculate operational day boundaries for dataOntem
      // Operational day "dataOntem" starts at: dataOntem + virada
      // Operational day "dataOntem" ends at: dataOntem+1 + virada - 1ms
      const inicioOpDay = `${dataOntem}T${virada.substring(0, 5)}:00-03:00`;
      const nextDay = new Date(yesterday);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      const fimOpDay = `${nextDayStr}T${virada.substring(0, 5)}:00-03:00`;

      const now = serverTime.toISOString();
      let eventoViagensFechadas = 0;
      let eventoMissoesCanceladas = 0;
      let eventoCheckouts = 0;

      // ======== ETAPA A: Fechar viagens abertas do dia operacional encerrado ========
      const { data: viagensAbertas, error: viagensError } = await supabase
        .from("viagens")
        .select("id")
        .eq("evento_id", evento.id)
        .eq("encerrado", false)
        .gte("data_criacao", inicioOpDay)
        .lt("data_criacao", fimOpDay);

      if (viagensError) {
        console.error(`[auto-checkout] Error fetching trips for event ${evento.id}:`, viagensError);
      } else if (viagensAbertas && viagensAbertas.length > 0) {
        const viagemIds = viagensAbertas.map((v) => v.id);
        const { error: updateViagensError } = await supabase
          .from("viagens")
          .update({
            encerrado: true,
            status: "encerrado",
            h_fim_real: now,
            observacao: "Encerrada automaticamente - virada do dia operacional",
          })
          .in("id", viagemIds);

        if (updateViagensError) {
          console.error(`[auto-checkout] Error closing trips:`, updateViagensError);
        } else {
          eventoViagensFechadas = viagemIds.length;
          console.log(`[auto-checkout] Closed ${viagemIds.length} trips for event "${evento.nome_planilha}" (opDay: ${dataOntem})`);
        }
      }

      // ======== ETAPA B: Cancelar missões ativas do dia anterior ========
      const { data: missoesAtivas, error: missoesError } = await supabase
        .from("missoes")
        .select("id")
        .eq("evento_id", evento.id)
        .eq("data_programada", dataOntem)
        .in("status", ["aceita", "em_andamento", "pendente"]);

      if (missoesError) {
        console.error(`[auto-checkout] Error fetching missions for event ${evento.id}:`, missoesError);
      } else if (missoesAtivas && missoesAtivas.length > 0) {
        const missaoIds = missoesAtivas.map((m) => m.id);
        const { error: updateMissoesError } = await supabase
          .from("missoes")
          .update({ status: "cancelada" })
          .in("id", missaoIds);

        if (updateMissoesError) {
          console.error(`[auto-checkout] Error cancelling missions:`, updateMissoesError);
        } else {
          eventoMissoesCanceladas = missaoIds.length;
          console.log(`[auto-checkout] Cancelled ${missaoIds.length} missions for event "${evento.nome_planilha}" (opDay: ${dataOntem})`);
        }
      }

      // ======== ETAPA C: Checkout automático + desvinculação bidirecional ========
      const { data: presencasAbertas, error: presencaError } = await supabase
        .from("motorista_presenca")
        .select("id, motorista_id")
        .eq("evento_id", evento.id)
        .eq("data", dataOntem)
        .not("checkin_at", "is", null)
        .is("checkout_at", null);

      if (presencaError) {
        console.error(`[auto-checkout] Error fetching presences for event ${evento.id}:`, presencaError);
        results.push({ evento: evento.nome_planilha, checkouts: 0, viagensFechadas: eventoViagensFechadas, missoesCanceladas: eventoMissoesCanceladas });
        continue;
      }

      if (!presencasAbertas || presencasAbertas.length === 0) {
        results.push({ evento: evento.nome_planilha, checkouts: 0, viagensFechadas: eventoViagensFechadas, missoesCanceladas: eventoMissoesCanceladas });
        continue;
      }

      const motoristaIds = presencasAbertas.map((p) => p.motorista_id);
      const presencaIds = presencasAbertas.map((p) => p.id);

      // Batch update presences
      const { error: updatePresencaError } = await supabase
        .from("motorista_presenca")
        .update({
          checkout_at: now,
          observacao_checkout: "Auto-checkout - virada do dia operacional",
        })
        .in("id", presencaIds);

      if (updatePresencaError) {
        console.error(`[auto-checkout] Error updating presences:`, updatePresencaError);
        results.push({ evento: evento.nome_planilha, checkouts: 0, viagensFechadas: eventoViagensFechadas, missoesCanceladas: eventoMissoesCanceladas });
        continue;
      }

      // Update motorista status to indisponivel + clear veiculo_id
      const { error: updateMotoristaError } = await supabase
        .from("motoristas")
        .update({ status: "indisponivel", veiculo_id: null })
        .in("id", motoristaIds)
        .eq("evento_id", evento.id);

      if (updateMotoristaError) {
        console.error(`[auto-checkout] Error updating motoristas:`, updateMotoristaError);
      }

      // Bidirectional: clear motorista_id on vehicles
      const { error: updateVeiculoError } = await supabase
        .from("veiculos")
        .update({ motorista_id: null })
        .in("motorista_id", motoristaIds)
        .eq("evento_id", evento.id);

      if (updateVeiculoError) {
        console.error(`[auto-checkout] Error clearing vehicles:`, updateVeiculoError);
      }

      eventoCheckouts = presencasAbertas.length;
      totalCheckouts += eventoCheckouts;
      totalViagensFechadas += eventoViagensFechadas;
      totalMissoesCanceladas += eventoMissoesCanceladas;
      results.push({
        evento: evento.nome_planilha,
        checkouts: eventoCheckouts,
        viagensFechadas: eventoViagensFechadas,
        missoesCanceladas: eventoMissoesCanceladas,
      });

      console.log(
        `[auto-checkout] Event "${evento.nome_planilha}" (opDay: ${dataOntem}): ${eventoCheckouts} checkouts, ${eventoViagensFechadas} trips closed, ${eventoMissoesCanceladas} missions cancelled`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalCheckouts,
        totalViagensFechadas,
        totalMissoesCanceladas,
        results,
        serverTime: serverTime.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-checkout] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
