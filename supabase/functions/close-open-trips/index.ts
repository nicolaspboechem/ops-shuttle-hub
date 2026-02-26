import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Parse SP time components directly from the fixed-format string
// Format: YYYY-MM-DDTHH:MI:SS.MS-03:00
function parseSPTime(serverTimeData: string) {
  const dataHoje = serverTimeData.substring(0, 10)
  const horaAtual = parseInt(serverTimeData.substring(11, 13))
  const minAtual = parseInt(serverTimeData.substring(14, 16))
  return { dataHoje, horaAtual, minAtual }
}

function calcDataOperacional(horaAtual: number, minAtual: number, dataHoje: string, virada: string) {
  const [hV, mV] = virada.split(':').map(Number)
  const viradaMin = hV * 60 + (mV || 0)
  const atualMin = horaAtual * 60 + minAtual

  if (atualMin < viradaMin) {
    // Antes da virada = dia anterior
    const d = new Date(dataHoje + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return dataHoje
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

    // Get synchronized server time (America/Sao_Paulo)
    const { data: serverTimeData, error: timeError } = await supabase.rpc('get_server_time')
    if (timeError) {
      console.warn('[close-open-trips] Error getting server time:', timeError)
    }

    // Parse SP time directly from string to avoid UTC conversion bugs
    const spTime = serverTimeData ? parseSPTime(serverTimeData) : null
    const serverTime = serverTimeData ? new Date(serverTimeData) : new Date()
    const serverTimeISO = serverTime.toISOString()
    const horaAtualSP = spTime?.horaAtual ?? serverTime.getHours()
    const minAtualSP = spTime?.minAtual ?? serverTime.getMinutes()
    const dataHojeSP = spTime?.dataHoje ?? serverTime.toISOString().substring(0, 10)

    console.log(`[close-open-trips] Running at ${serverTimeISO} (SP parsed: ${dataHojeSP} ${horaAtualSP}:${minAtualSP})`)

    // Fetch all active events with their virada time and data_fim
    const { data: eventosRaw, error: eventosError } = await supabase
      .from('eventos')
      .select('id, horario_virada_dia, nome_planilha, data_fim')
      .eq('status', 'ativo')

    if (eventosError) {
      console.error('[close-open-trips] Error fetching events:', eventosError)
      throw eventosError
    }

    let totalClosed = 0
    const details: { evento: string; closed: number }[] = []
    let totalEventosFinalizados = 0

    // ======== BLOCO 0: Auto-finalizar eventos pela data de término ========
    const eventosFinalizadosIds = new Set<string>()

    for (const evento of (eventosRaw || [])) {
      if (!evento.data_fim) continue

      const virada = evento.horario_virada_dia || '04:00:00'
      const dataOpAtual = calcDataOperacional(horaAtualSP, minAtualSP, dataHojeSP, virada)

      // Evento só é finalizado quando data operacional atual > data_fim
      if (dataOpAtual <= evento.data_fim) continue

      console.log(`[close-open-trips] BLOCO 0: Finalizando evento "${evento.nome_planilha}" (data_fim=${evento.data_fim}, dataOp=${dataOpAtual})`)
      eventosFinalizadosIds.add(evento.id)

      // 1. Encerrar TODAS as viagens abertas do evento
      const { data: openTrips } = await supabase
        .from('viagens')
        .select('id')
        .eq('evento_id', evento.id)
        .eq('encerrado', false)

      if (openTrips && openTrips.length > 0) {
        const tripIds = openTrips.map(t => t.id)
        const { error: closeErr } = await supabase
          .from('viagens')
          .update({
            encerrado: true,
            status: 'encerrado',
            h_fim_real: serverTimeISO,
            observacao: `Encerrada automaticamente - evento "${evento.nome_planilha}" finalizado (data_fim=${evento.data_fim})`,
          })
          .in('id', tripIds)

        if (!closeErr) {
          totalClosed += tripIds.length
          details.push({ evento: evento.nome_planilha, closed: tripIds.length })
          console.log(`[close-open-trips] BLOCO 0: Closed ${tripIds.length} trips for event "${evento.nome_planilha}"`)
        } else {
          console.error(`[close-open-trips] BLOCO 0: Error closing trips:`, closeErr)
        }
      }

      // 2. Desvincular TODOS os veículos de motoristas (bidirecional)
      const { data: motoristasComVeiculo } = await supabase
        .from('motoristas')
        .select('id, nome, veiculo_id')
        .eq('evento_id', evento.id)
        .not('veiculo_id', 'is', null)

      if (motoristasComVeiculo && motoristasComVeiculo.length > 0) {
        for (const mot of motoristasComVeiculo) {
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
              observacoes: `Desvinculado automaticamente - evento "${evento.nome_planilha}" finalizado`,
            }),
          ])
        }
        console.log(`[close-open-trips] BLOCO 0: Unlinked ${motoristasComVeiculo.length} vehicles for event "${evento.nome_planilha}"`)
      }

      // 3. Checkout automático de todas as presenças ativas
      const { error: checkoutErr } = await supabase
        .from('motorista_presenca')
        .update({
          checkout_at: serverTimeISO,
          observacao_checkout: `Checkout automático - evento "${evento.nome_planilha}" finalizado`,
        })
        .eq('evento_id', evento.id)
        .not('checkin_at', 'is', null)
        .is('checkout_at', null)

      if (checkoutErr) {
        console.error(`[close-open-trips] BLOCO 0: Error auto-checkout:`, checkoutErr)
      }

      // 4. Atualizar status dos motoristas
      await supabase
        .from('motoristas')
        .update({ status: 'indisponivel' })
        .eq('evento_id', evento.id)

      // 5. Finalizar o evento
      const { error: finalizeErr } = await supabase
        .from('eventos')
        .update({ status: 'finalizado' })
        .eq('id', evento.id)

      if (!finalizeErr) {
        totalEventosFinalizados++
        console.log(`[close-open-trips] BLOCO 0: Event "${evento.nome_planilha}" finalized successfully`)
      } else {
        console.error(`[close-open-trips] BLOCO 0: Error finalizing event:`, finalizeErr)
      }
    }

    // Filtrar eventos finalizados para não processar nos blocos seguintes
    const eventos = (eventosRaw || []).filter(e => !eventosFinalizadosIds.has(e.id))

    // ======== BLOCO 1: Event-aware - fechar viagens de dias operacionais anteriores ========
    for (const evento of (eventos || [])) {
      const virada = evento.horario_virada_dia || '04:00:00'
      const viradaHHMM = virada.substring(0, 5)
      const dataOpAtual = calcDataOperacional(horaAtualSP, minAtualSP, dataHojeSP, virada)
      const cutoffISO = `${dataOpAtual}T${viradaHHMM}:00-03:00`

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
      const dataOpHoje = calcDataOperacional(horaAtualSP, minAtualSP, dataHojeSP, virada)

      const { data: motoristasComVeiculo } = await supabase
        .from('motoristas')
        .select('id, nome, veiculo_id')
        .eq('evento_id', evento.id)
        .not('veiculo_id', 'is', null)

      if (!motoristasComVeiculo || motoristasComVeiculo.length === 0) continue

      for (const mot of motoristasComVeiculo) {
        const { data: presencaAtiva } = await supabase
          .from('motorista_presenca')
          .select('id')
          .eq('motorista_id', mot.id)
          .eq('evento_id', evento.id)
          .eq('data', dataOpHoje)
          .not('checkin_at', 'is', null)
          .is('checkout_at', null)
          .limit(1)

        if (presencaAtiva && presencaAtiva.length > 0) continue

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
    const { data: orphanTrips, error: orphanError } = await supabase
      .from('viagens')
      .select('id')
      .eq('encerrado', false)
      .is('evento_id', null)
      .lt('data_criacao', `${dataHojeSP}T00:00:00-03:00`)

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

    // ======== BLOCO 4: Fechar vinculações órfãs de dias anteriores ========
    let totalOrphansClosed = 0
    for (const evento of (eventos || [])) {
      const virada = evento.horario_virada_dia || '04:00:00'
      const viradaHHMM = virada.substring(0, 5)
      const dataOpAtual = calcDataOperacional(horaAtualSP, minAtualSP, dataHojeSP, virada)
      const cutoffISO = `${dataOpAtual}T${viradaHHMM}:00-03:00`

      // Buscar todas as vinculações deste evento antes do dia operacional atual
      const { data: allVinculacoes, error: vincError } = await supabase
        .from('veiculo_vistoria_historico')
        .select('id, veiculo_id, motorista_id, motorista_nome, created_at')
        .eq('evento_id', evento.id)
        .eq('tipo_vistoria', 'vinculacao')
        .lt('created_at', cutoffISO)
        .order('created_at', { ascending: true })

      if (vincError || !allVinculacoes || allVinculacoes.length === 0) continue

      // Buscar todas as desvinculações deste evento
      const { data: allDesvinculacoes } = await supabase
        .from('veiculo_vistoria_historico')
        .select('id, veiculo_id, motorista_id, created_at')
        .eq('evento_id', evento.id)
        .eq('tipo_vistoria', 'desvinculacao')
        .order('created_at', { ascending: true })

      const desvSet = new Set<string>()
      const desvByVeiculo = new Map<string, { created_at: string }[]>()
      for (const d of (allDesvinculacoes || [])) {
        // Index desvinculações por veiculo para lookup rápido
        const arr = desvByVeiculo.get(d.veiculo_id) || []
        arr.push(d)
        desvByVeiculo.set(d.veiculo_id, arr)
      }

      // Agrupar vinculações por veículo para encontrar próxima vinculação
      const vincByVeiculo = new Map<string, typeof allVinculacoes>()
      for (const v of allVinculacoes) {
        const arr = vincByVeiculo.get(v.veiculo_id) || []
        arr.push(v)
        vincByVeiculo.set(v.veiculo_id, arr)
      }

      // Identificar vinculações órfãs: sem desvinculação entre ela e a próxima vinculação
      for (const [veiculoId, vincs] of vincByVeiculo) {
        const desvs = desvByVeiculo.get(veiculoId) || []

        for (let i = 0; i < vincs.length; i++) {
          const vinc = vincs[i]
          const nextVinc = vincs[i + 1] // pode ser undefined se for a última

          // Verificar se existe desvinculação entre esta vinculação e a próxima (ou agora)
          const upperBound = nextVinc ? nextVinc.created_at : cutoffISO
          const hasDesv = desvs.some(d => d.created_at > vinc.created_at && d.created_at <= upperBound)
          
          if (hasDesv) continue // Ciclo já fechado

          // É órfã! Determinar timestamp de fechamento por prioridade:
          let closeTimestamp: string | null = null
          let closeSource = ''

          // Prioridade 1: Próxima vinculação no mesmo veículo (troca de motorista)
          if (nextVinc) {
            closeTimestamp = nextVinc.created_at
            closeSource = 'Troca de motorista'
          }

          // Prioridade 2: Última viagem encerrada do motorista após a vinculação
          if (!closeTimestamp && vinc.motorista_id) {
            const { data: lastTrip } = await supabase
              .from('viagens')
              .select('h_fim_real')
              .eq('motorista_id', vinc.motorista_id)
              .eq('veiculo_id', veiculoId)
              .eq('encerrado', true)
              .gt('h_fim_real', vinc.created_at)
              .lt('h_fim_real', cutoffISO)
              .order('h_fim_real', { ascending: false })
              .limit(1)

            if (lastTrip && lastTrip.length > 0 && lastTrip[0].h_fim_real) {
              closeTimestamp = lastTrip[0].h_fim_real
              closeSource = 'Última viagem encerrada'
            }
          }

          // Prioridade 3: Checkout do motorista após a vinculação
          if (!closeTimestamp && vinc.motorista_id) {
            const vincDate = vinc.created_at.substring(0, 10)
            const { data: checkout } = await supabase
              .from('motorista_presenca')
              .select('checkout_at')
              .eq('motorista_id', vinc.motorista_id)
              .eq('evento_id', evento.id)
              .not('checkout_at', 'is', null)
              .gte('checkout_at', vinc.created_at)
              .lt('checkout_at', cutoffISO)
              .order('checkout_at', { ascending: true })
              .limit(1)

            if (checkout && checkout.length > 0 && checkout[0].checkout_at) {
              closeTimestamp = checkout[0].checkout_at
              closeSource = 'Checkout do motorista'
            }
          }

          // Prioridade 4: Virada do dia seguinte à vinculação
          if (!closeTimestamp) {
            const vincDate = vinc.created_at.substring(0, 10)
            const nextDay = new Date(vincDate + 'T12:00:00')
            nextDay.setDate(nextDay.getDate() + 1)
            const nextDayStr = nextDay.toISOString().slice(0, 10)
            closeTimestamp = `${nextDayStr}T${viradaHHMM}:00-03:00`
            closeSource = 'Virada do dia operacional'
          }

          // Inserir desvinculação retroativa
          const { error: insertError } = await supabase
            .from('veiculo_vistoria_historico')
            .insert({
              veiculo_id: veiculoId,
              evento_id: evento.id,
              tipo_vistoria: 'desvinculacao',
              status_anterior: 'vinculado',
              status_novo: 'disponivel',
              motorista_id: vinc.motorista_id,
              motorista_nome: vinc.motorista_nome,
              created_at: closeTimestamp,
              observacoes: `Desvinculação retroativa (correção automática) - ${closeSource}`,
            })

          if (insertError) {
            console.error(`[close-open-trips] Error inserting retroactive desvinculacao for vinc ${vinc.id}:`, insertError)
          } else {
            totalOrphansClosed++
          }
        }
      }

      if (totalOrphansClosed > 0) {
        console.log(`[close-open-trips] Event "${evento.nome_planilha}": closed ${totalOrphansClosed} orphan vinculações`)
      }
    }

    console.log(`[close-open-trips] Total closed trips: ${totalClosed}, orphan vinculações closed: ${totalOrphansClosed}, eventos finalizados: ${totalEventosFinalizados}`)

    return new Response(JSON.stringify({ 
      success: true, 
      closed: totalClosed,
      orphanVinculacoesClosed: totalOrphansClosed,
      unlinked: totalUnlinked,
      eventosFinalizados: totalEventosFinalizados,
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
