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

    // Obter hora sincronizada do banco de dados (America/Sao_Paulo)
    const { data: serverTimeData, error: timeError } = await supabase.rpc('get_server_time')
    if (timeError) {
      console.warn('[close-open-trips] Erro ao obter hora do servidor:', timeError)
    }
    const serverTime = serverTimeData ? new Date(serverTimeData) : new Date()
    const serverTimeISO = serverTime.toISOString()
    console.log(`[close-open-trips] Executando às ${serverTimeISO} (SP)`)

    // Extrair data atual SP (YYYY-MM-DD) do serverTime
    const spDateStr = serverTimeData
      ? serverTimeData.substring(0, 10)
      : serverTime.toISOString().substring(0, 10)

    // ======== BLOCO 1: Fechar viagens de dias anteriores ========
    const { data: oldTrips, error: oldError } = await supabase
      .from('viagens')
      .select('id')
      .eq('encerrado', false)
      .lt('data_criacao', `${spDateStr}T00:00:00-03:00`)

    if (oldError) {
      console.error('[close-open-trips] Erro ao buscar viagens antigas:', oldError)
    } else if (oldTrips && oldTrips.length > 0) {
      const oldIds = oldTrips.map(t => t.id)
      console.log(`[close-open-trips] Fechando ${oldIds.length} viagens de dias anteriores`)

      const { error: oldUpdateError } = await supabase
        .from('viagens')
        .update({
          encerrado: true,
          status: 'encerrado',
          h_fim_real: serverTimeISO,
          observacao: 'Encerrada automaticamente - dia anterior',
        })
        .in('id', oldIds)

      if (oldUpdateError) {
        console.error('[close-open-trips] Erro ao fechar viagens antigas:', oldUpdateError)
      } else {
        console.log(`[close-open-trips] ${oldIds.length} viagens de dias anteriores encerradas`)
      }
    }

    // ======== BLOCO 2: Lógica original - fechar viagens duplicadas do mesmo motorista ========
    const { data: openTrips, error: openError } = await supabase
      .from('viagens')
      .select('id, motorista, h_pickup, h_chegada, evento_id')
      .eq('encerrado', false)
      .order('h_pickup', { ascending: true })

    if (openError) throw openError

    console.log(`Found ${openTrips?.length || 0} open trips`)

    // Group by evento_id and motorista
    const tripsByDriver = new Map<string, typeof openTrips>()
    
    for (const trip of openTrips || []) {
      const key = `${trip.evento_id}|${trip.motorista}`
      if (!tripsByDriver.has(key)) {
        tripsByDriver.set(key, [])
      }
      tripsByDriver.get(key)!.push(trip)
    }

    const tripsToClose: string[] = []
    const closedDetails: Array<{ id: string; motorista: string; h_pickup: string }> = []

    // For each driver, if they have multiple open trips, close all but the last one
    for (const [key, trips] of tripsByDriver) {
      if (trips.length > 1) {
        trips.sort((a, b) => {
          const timeA = a.h_pickup || '00:00:00'
          const timeB = b.h_pickup || '00:00:00'
          return timeA.localeCompare(timeB)
        })
        
        for (let i = 0; i < trips.length - 1; i++) {
          tripsToClose.push(trips[i].id)
          closedDetails.push({
            id: trips[i].id,
            motorista: trips[i].motorista,
            h_pickup: trips[i].h_pickup
          })
        }
      }
    }

    // Also check for trips where driver has a later closed trip
    const { data: allTrips, error: allError } = await supabase
      .from('viagens')
      .select('id, motorista, h_pickup, encerrado, evento_id')
      .order('h_pickup', { ascending: true })

    if (!allError && allTrips) {
      const closedTripsByDriver = new Map<string, typeof allTrips>()
      
      for (const trip of allTrips) {
        if (trip.encerrado) {
          const key = `${trip.evento_id}|${trip.motorista}`
          if (!closedTripsByDriver.has(key)) {
            closedTripsByDriver.set(key, [])
          }
          closedTripsByDriver.get(key)!.push(trip)
        }
      }

      for (const trip of openTrips || []) {
        if (tripsToClose.includes(trip.id)) continue
        
        const key = `${trip.evento_id}|${trip.motorista}`
        const closedTrips = closedTripsByDriver.get(key) || []
        
        const hasLaterClosedTrip = closedTrips.some(ct => {
          const openTime = trip.h_pickup || '00:00:00'
          const closedTime = ct.h_pickup || '00:00:00'
          return closedTime > openTime
        })

        if (hasLaterClosedTrip) {
          tripsToClose.push(trip.id)
          closedDetails.push({
            id: trip.id,
            motorista: trip.motorista,
            h_pickup: trip.h_pickup
          })
        }
      }
    }

    console.log(`Closing ${tripsToClose.length} trips`)

    // Close all identified trips with full status update
    if (tripsToClose.length > 0) {
      const { error: updateError } = await supabase
        .from('viagens')
        .update({
          encerrado: true,
          status: 'encerrado',
          h_fim_real: serverTimeISO,
        })
        .in('id', tripsToClose)

      if (updateError) {
        console.error('Error closing trips:', updateError)
        throw updateError
      }
    }

    console.log(`Successfully closed ${tripsToClose.length} trips`)

    return new Response(JSON.stringify({ 
      success: true, 
      closed: tripsToClose.length,
      oldTrips: oldTrips?.length || 0,
      details: closedDetails.slice(0, 50)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
