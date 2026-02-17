import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get synchronized server time (America/Sao_Paulo)
    const { data: serverTimeData, error: timeError } = await supabase.rpc('get_server_time')
    if (timeError) {
      console.warn('[close-open-trips] Error getting server time:', timeError)
    }
    const serverTime = serverTimeData ? new Date(serverTimeData) : new Date()
    const serverTimeISO = serverTime.toISOString()
    console.log(`[close-open-trips] Running at ${serverTimeISO} (SP)`)

    // Fetch all active events with their virada time
    const { data: eventos, error: eventosError } = await supabase
      .from('eventos')
      .select('id, horario_virada_dia, nome_planilha')
      .eq('status', 'ativo')

    if (eventosError) {
      console.error('[close-open-trips] Error fetching events:', eventosError)
      throw eventosError
    }

    let totalClosed = 0
    const details: { evento: string; closed: number }[] = []

    // ======== BLOCO 1: Event-aware - fechar viagens de dias operacionais anteriores ========
    for (const evento of (eventos || [])) {
      const virada = evento.horario_virada_dia || '04:00:00'
      const viradaHHMM = virada.substring(0, 5)

      // Calculate current operational date for this event
      const [horaVirada, minVirada] = virada.split(':').map(Number)
      const viradaMinutos = horaVirada * 60 + (minVirada || 0)
      const horaAtual = serverTime.getHours()
      const minAtual = serverTime.getMinutes()
      const atualMinutos = horaAtual * 60 + minAtual

      // Current operational date
      let dataOpAtual: string
      if (atualMinutos < viradaMinutos) {
        const ontem = new Date(serverTime)
        ontem.setDate(ontem.getDate() - 1)
        dataOpAtual = ontem.toISOString().slice(0, 10)
      } else {
        dataOpAtual = serverTime.toISOString().slice(0, 10)
      }

      // The cutoff: anything before the START of the current operational day should be closed
      // Current op day starts at: dataOpAtual + virada
      const cutoffISO = `${dataOpAtual}T${viradaHHMM}:00-03:00`

      // Find open trips for this event created before the current operational day
      const { data: oldTrips, error: oldError } = await supabase
        .from('viagens')
        .select('id')
        .eq('evento_id', evento.id)
        .eq('encerrado', false)
        .lt('data_criacao', cutoffISO)

      if (oldError) {
        console.error(`[close-open-trips] Error fetching trips for event ${evento.id}:`, oldError)
        continue
      }

      if (oldTrips && oldTrips.length > 0) {
        const oldIds = oldTrips.map(t => t.id)
        const { error: updateError } = await supabase
          .from('viagens')
          .update({
            encerrado: true,
            status: 'encerrado',
            h_fim_real: serverTimeISO,
            observacao: 'Encerrada automaticamente - fallback close-open-trips',
          })
          .in('id', oldIds)

        if (updateError) {
          console.error(`[close-open-trips] Error closing trips for event ${evento.id}:`, updateError)
        } else {
          totalClosed += oldIds.length
          details.push({ evento: evento.nome_planilha, closed: oldIds.length })
          console.log(`[close-open-trips] Closed ${oldIds.length} orphan trips for event "${evento.nome_planilha}" (cutoff: ${cutoffISO})`)
        }
      }
    }

    // ======== BLOCO 2: Desvincular veículos órfãos de motoristas sem presença ativa ========
    let totalUnlinked = 0
    for (const evento of (eventos || [])) {
      const virada = evento.horario_virada_dia || '04:00:00'
      const [hV, mV] = virada.split(':').map(Number)
      const viradaMin = hV * 60 + (mV || 0)
      const horaAt = serverTime.getHours()
      const minAt = serverTime.getMinutes()
      const atualMin = horaAt * 60 + minAt

      let dataOpHoje: string
      if (atualMin < viradaMin) {
        const ontem = new Date(serverTime)
        ontem.setDate(ontem.getDate() - 1)
        dataOpHoje = ontem.toISOString().slice(0, 10)
      } else {
        dataOpHoje = serverTime.toISOString().slice(0, 10)
      }

      // Buscar motoristas com veículo vinculado neste evento
      const { data: motoristasComVeiculo } = await supabase
        .from('motoristas')
        .select('id, nome, veiculo_id')
        .eq('evento_id', evento.id)
        .not('veiculo_id', 'is', null)

      if (!motoristasComVeiculo || motoristasComVeiculo.length === 0) continue

      for (const mot of motoristasComVeiculo) {
        // Verificar se tem presença ativa (checkin sem checkout) no dia operacional atual
        const { data: presencaAtiva } = await supabase
          .from('motorista_presenca')
          .select('id')
          .eq('motorista_id', mot.id)
          .eq('evento_id', evento.id)
          .eq('data', dataOpHoje)
          .not('checkin_at', 'is', null)
          .is('checkout_at', null)
          .limit(1)

        if (presencaAtiva && presencaAtiva.length > 0) continue // Tem presença ativa, pular

        // Desvincular bidirecionalmente
        console.log(`[close-open-trips] Unlinking vehicle ${mot.veiculo_id} from driver ${mot.nome} (no active presence on ${dataOpHoje})`)
        
        await Promise.all([
          supabase.from('motoristas').update({ veiculo_id: null }).eq('id', mot.id),
          supabase.from('veiculos').update({ motorista_id: null }).eq('id', mot.veiculo_id!),
          supabase.from('veiculo_vistoria_historico').insert({
            veiculo_id: mot.veiculo_id!,
            evento_id: evento.id,
            tipo_vistoria: 'desvinculacao',
            status_anterior: 'vinculado',
            status_novo: 'disponivel',
            motorista_id: mot.id,
            motorista_nome: mot.nome,
            observacoes: `Desvinculado automaticamente - sem presença ativa em ${dataOpHoje}`,
          }),
        ])
        totalUnlinked++
      }
    }

    if (totalUnlinked > 0) {
      console.log(`[close-open-trips] Total vehicles unlinked: ${totalUnlinked}`)
    }

    // ======== BLOCO 3: Safety net - viagens sem evento_id (órfãs) ========
    const spDateStr = serverTimeData
      ? serverTimeData.substring(0, 10)
      : serverTime.toISOString().substring(0, 10)

    const { data: orphanTrips, error: orphanError } = await supabase
      .from('viagens')
      .select('id')
      .eq('encerrado', false)
      .is('evento_id', null)
      .lt('data_criacao', `${spDateStr}T00:00:00-03:00`)

    if (orphanError) {
      console.error('[close-open-trips] Error fetching orphan trips:', orphanError)
    } else if (orphanTrips && orphanTrips.length > 0) {
      const orphanIds = orphanTrips.map(t => t.id)
      const { error: updateOrphanError } = await supabase
        .from('viagens')
        .update({
          encerrado: true,
          status: 'encerrado',
          h_fim_real: serverTimeISO,
          observacao: 'Encerrada automaticamente - viagem órfã sem evento',
        })
        .in('id', orphanIds)

      if (!updateOrphanError) {
        totalClosed += orphanIds.length
        details.push({ evento: '(sem evento)', closed: orphanIds.length })
        console.log(`[close-open-trips] Closed ${orphanIds.length} orphan trips without evento_id`)
      }
    }

    console.log(`[close-open-trips] Total closed: ${totalClosed}`)

    return new Response(JSON.stringify({ 
      success: true, 
      closed: totalClosed,
      details,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('[close-open-trips] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
