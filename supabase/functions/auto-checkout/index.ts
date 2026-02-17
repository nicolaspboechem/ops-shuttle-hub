const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auto-checkout desativado - o histórico de veículos usa created_at das ações reais
  return new Response(
    JSON.stringify({ message: "Auto-checkout desativado", disabled: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
