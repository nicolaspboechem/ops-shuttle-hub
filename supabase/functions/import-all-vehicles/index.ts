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
    // Auth check: require admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Step 1: Delete orphaned data
    await supabase.from('motoristas').delete().is('evento_id', null)
    await supabase.from('veiculos').delete().is('evento_id', null)

    // Step 2: Get all events
    const { data: eventos } = await supabase.from('eventos').select('id, nome_planilha')

    const results: any[] = []

    for (const evento of eventos || []) {
      // Get all trips for this event with vehicle/driver info
      const { data: viagens } = await supabase
        .from('viagens')
        .select('tipo_veiculo, placa, motorista')
        .eq('evento_id', evento.id)
        .not('placa', 'is', null)

      if (!viagens || viagens.length === 0) {
        results.push({ evento: evento.nome_planilha, veiculos: 0, motoristas: 0 })
        continue
      }

      // Count driver occurrences per plate to find primary driver
      const placaDriverCount = new Map<string, Map<string, number>>()
      viagens.forEach(v => {
        if (!v.placa) return
        if (!placaDriverCount.has(v.placa)) {
          placaDriverCount.set(v.placa, new Map())
        }
        const driverMap = placaDriverCount.get(v.placa)!
        const current = driverMap.get(v.motorista) || 0
        driverMap.set(v.motorista, current + 1)
      })

      // Get unique vehicles with their primary driver
      const veiculosUnicos = new Map<string, { tipo_veiculo: string; placa: string; motorista: string }>()
      for (const [placa, driverMap] of placaDriverCount) {
        // Find driver with most trips for this plate
        let primaryDriver = ''
        let maxCount = 0
        for (const [driver, count] of driverMap) {
          if (count > maxCount) {
            maxCount = count
            primaryDriver = driver
          }
        }
        
        // Get tipo_veiculo from first occurrence
        const firstTrip = viagens.find(v => v.placa === placa)
        veiculosUnicos.set(placa, {
          tipo_veiculo: firstTrip?.tipo_veiculo || 'Van',
          placa,
          motorista: primaryDriver
        })
      }

      let veiculosCriados = 0
      let motoristasCriados = 0

      // Check existing vehicles for this event
      const { data: existingVeiculos, error: existingError } = await supabase
        .from('veiculos')
        .select('placa')
        .eq('evento_id', evento.id)
      
      console.log(`Event ${evento.nome_planilha}: found ${existingVeiculos?.length || 0} existing vehicles, ${veiculosUnicos.size} unique from trips`)
      
      const existingPlacas = new Set((existingVeiculos || []).map(v => v.placa))

      // Insert vehicles and drivers
      for (const [placa, dados] of veiculosUnicos) {
        if (existingPlacas.has(placa)) continue

        // Create vehicle
        const { data: novoVeiculo, error: veiculoError } = await supabase
          .from('veiculos')
          .insert({
            placa: dados.placa,
            tipo_veiculo: dados.tipo_veiculo,
            evento_id: evento.id,
            ativo: true
          })
          .select()
          .single()

        if (veiculoError) {
          console.error('Error creating vehicle:', veiculoError)
          continue
        }

        veiculosCriados++

        // Create linked driver
        if (dados.motorista) {
          const { error: motoristaError } = await supabase
            .from('motoristas')
            .insert({
              nome: dados.motorista,
              evento_id: evento.id,
              veiculo_id: novoVeiculo.id,
              ativo: true
            })

          if (!motoristaError) {
            motoristasCriados++
          } else {
            console.error('Error creating driver:', motoristaError)
          }
        }
      }

      results.push({
        evento: evento.nome_planilha,
        veiculos: veiculosCriados,
        motoristas: motoristasCriados
      })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Import error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
