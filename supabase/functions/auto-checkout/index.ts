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

    // Fetch active events with missions enabled
    const { data: eventos, error: eventosError } = await supabase
      .from("eventos")
      .select("id, horario_virada_dia, nome_planilha")
      .eq("status", "ativo")
      .eq("habilitar_missoes", true);

    if (eventosError) throw eventosError;
    if (!eventos || eventos.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active events with missions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalCheckouts = 0;
    const results: { evento: string; checkouts: number }[] = [];

    for (const evento of eventos) {
      const virada = evento.horario_virada_dia || "04:00:00";
      const [horaVirada, minVirada] = virada.split(":").map(Number);
      const viradaMinutos = horaVirada * 60 + (minVirada || 0);

      // Only act within a 15-minute window after the turnover time
      const diffMinutos = atualMinutos - viradaMinutos;
      // Handle midnight wrapping: if virada is 23:50 and now is 00:05, diff = -1425, adjust
      const adjustedDiff = diffMinutos < -720 ? diffMinutos + 1440 : diffMinutos;

      if (adjustedDiff < 0 || adjustedDiff >= 15) {
        continue; // Not in the window
      }

      // Calculate yesterday's operational date
      // If virada is at 02:30 and it's now 02:35, the operational day that just ended
      // is the day before the current calendar date (because before virada = previous op day)
      // But at virada time, we ARE past the virada, so "today" is the new op day
      // We need to close the PREVIOUS op day
      const yesterday = new Date(serverTime);
      yesterday.setDate(yesterday.getDate() - 1);
      // If virada is after midnight (e.g., 02:30) and current time is just past virada,
      // yesterday's operational date is the previous calendar date
      const dataOntem = yesterday.toISOString().slice(0, 10);

      // But if virada is e.g. 22:00, and it's 22:05, the previous op day started at 22:00 yesterday
      // In that case, data_ontem should be today's date minus 1
      // Actually, for the operational day system: 
      // getDataOperacional(timestamp, virada) returns the date that "owns" that timestamp
      // At virada time exactly, the NEW day starts
      // So the day that just ended = if virada <= current time, the op day is "today" for timestamps before virada
      // The records we want have data = date of yesterday's operational day
      // For virada at 02:30 on Jan 12, the op day "Jan 11" runs from Jan 11 02:30 to Jan 12 02:29
      // At 02:35 on Jan 12, we want to close records with data = "2025-01-11"
      // dataOntem calculation: the current server date is Jan 12, so yesterday = Jan 11 ✓
      // For virada at 22:00 on Jan 11: op day "Jan 11" runs from Jan 11 22:00 to Jan 12 21:59
      // At 22:05 on Jan 11, we want to close records with data = "2025-01-10"
      // But yesterday = Jan 10 ✓ ... wait, serverTime date is Jan 11, yesterday = Jan 10 ✓

      // Find open presence records for yesterday's operational date
      const { data: presencasAbertas, error: presencaError } = await supabase
        .from("motorista_presenca")
        .select("id, motorista_id")
        .eq("evento_id", evento.id)
        .eq("data", dataOntem)
        .not("checkin_at", "is", null)
        .is("checkout_at", null);

      if (presencaError) {
        console.error(`Error fetching presences for event ${evento.id}:`, presencaError);
        continue;
      }

      if (!presencasAbertas || presencasAbertas.length === 0) {
        results.push({ evento: evento.nome_planilha, checkouts: 0 });
        continue;
      }

      const now = serverTime.toISOString();
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
        console.error(`Error updating presences:`, updatePresencaError);
        continue;
      }

      // Update motorista status to indisponivel
      const { error: updateMotoristaError } = await supabase
        .from("motoristas")
        .update({ status: "indisponivel" })
        .in("id", motoristaIds)
        .eq("evento_id", evento.id);

      if (updateMotoristaError) {
        console.error(`Error updating motoristas:`, updateMotoristaError);
      }

      totalCheckouts += presencasAbertas.length;
      results.push({
        evento: evento.nome_planilha,
        checkouts: presencasAbertas.length,
      });

      console.log(
        `Auto-checkout: ${presencasAbertas.length} motoristas for event "${evento.nome_planilha}" (data: ${dataOntem})`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalCheckouts,
        results,
        serverTime: serverTime.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
