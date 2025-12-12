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

    // Get all open trips
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
        // Sort by h_pickup
        trips.sort((a, b) => {
          const timeA = a.h_pickup || '00:00:00'
          const timeB = b.h_pickup || '00:00:00'
          return timeA.localeCompare(timeB)
        })
        
        // Close all but the last trip
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

    console.log(`Closing ${tripsToClose.length} trips`)

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

      // For each open trip, check if driver has a later closed trip
      for (const trip of openTrips || []) {
        if (tripsToClose.includes(trip.id)) continue
        
        const key = `${trip.evento_id}|${trip.motorista}`
        const closedTrips = closedTripsByDriver.get(key) || []
        
        // Check if any closed trip has a later h_pickup
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

    // Close all identified trips
    if (tripsToClose.length > 0) {
      const { error: updateError } = await supabase
        .from('viagens')
        .update({ encerrado: true })
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
      details: closedDetails.slice(0, 50) // Limit details to first 50
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
