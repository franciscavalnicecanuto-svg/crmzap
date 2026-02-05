import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// GET - Calcular métricas de tempo baseadas em mensagens reais
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ 
      success: false, 
      error: 'Supabase not configured',
      // Return mock data as fallback
      data: {
        avgResponseTimeMinutes: null,
        avgCycleDays: null,
        heatMap: null,
        totalMessages: 0,
        analyzedConversations: 0
      }
    })
  }

  try {
    // 1. Buscar todas as mensagens dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, remote_jid, from_me, timestamp')
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: true })

    if (messagesError) {
      // Table might not exist - return empty data
      if (messagesError.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: {
            avgResponseTimeMinutes: null,
            avgCycleDays: null,
            heatMap: generateEmptyHeatMap(),
            totalMessages: 0,
            analyzedConversations: 0
          }
        })
      }
      throw messagesError
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          avgResponseTimeMinutes: null,
          avgCycleDays: null,
          heatMap: generateEmptyHeatMap(),
          totalMessages: 0,
          analyzedConversations: 0
        }
      })
    }

    // 2. Agrupar mensagens por conversa (remote_jid)
    const conversationMap = new Map<string, Array<{ from_me: boolean; timestamp: Date }>>()
    
    for (const msg of messages) {
      const jid = msg.remote_jid
      if (!conversationMap.has(jid)) {
        conversationMap.set(jid, [])
      }
      conversationMap.get(jid)!.push({
        from_me: msg.from_me,
        timestamp: new Date(msg.timestamp)
      })
    }

    // 3. Calcular tempo médio de resposta
    const responseTimes: number[] = []
    
    for (const [_, msgs] of conversationMap) {
      // Ordenar por timestamp
      msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      for (let i = 0; i < msgs.length - 1; i++) {
        const current = msgs[i]
        const next = msgs[i + 1]
        
        // Se mensagem do lead seguida de resposta nossa
        if (!current.from_me && next.from_me) {
          const responseTimeMs = next.timestamp.getTime() - current.timestamp.getTime()
          const responseTimeMinutes = responseTimeMs / (1000 * 60)
          
          // Ignorar respostas > 24h (provavelmente não é uma resposta direta)
          if (responseTimeMinutes <= 1440) {
            responseTimes.push(responseTimeMinutes)
          }
        }
      }
    }

    const avgResponseTimeMinutes = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null

    // 4. Gerar Heat Map (distribuição de mensagens por dia/hora)
    // Formato: 6 linhas (horários) x 7 colunas (dias da semana)
    // Horários: 6h, 9h, 12h, 15h, 18h, 21h
    const heatMap: number[][] = Array(6).fill(null).map(() => Array(7).fill(0))
    const hourRanges = [6, 9, 12, 15, 18, 21]

    for (const msg of messages) {
      const date = new Date(msg.timestamp)
      const hour = date.getHours()
      const dayOfWeek = date.getDay() // 0 = Sunday

      // Encontrar o range de hora mais próximo
      let hourIndex = 0
      for (let i = 0; i < hourRanges.length; i++) {
        if (hour >= hourRanges[i]) {
          hourIndex = i
        }
      }

      // Incrementar contador
      if (heatMap[hourIndex]) {
        heatMap[hourIndex][dayOfWeek]++
      }
    }

    // 5. Calcular ciclo médio de venda (se tivermos dados de lead_status)
    let avgCycleDays: number | null = null
    
    try {
      const { data: statusData } = await supabase
        .from('lead_status')
        .select('remote_jid, status, updated_at')
        .eq('status', 'fechado')

      if (statusData && statusData.length > 0) {
        const cycleTimes: number[] = []
        
        for (const lead of statusData) {
          // Encontrar primeira mensagem deste lead
          const leadMessages = conversationMap.get(lead.remote_jid)
          if (leadMessages && leadMessages.length > 0) {
            const firstMessage = leadMessages[0].timestamp
            const closedAt = new Date(lead.updated_at)
            const cycleDays = (closedAt.getTime() - firstMessage.getTime()) / (1000 * 60 * 60 * 24)
            
            // Ignorar ciclos > 90 dias ou negativos
            if (cycleDays > 0 && cycleDays <= 90) {
              cycleTimes.push(cycleDays)
            }
          }
        }

        if (cycleTimes.length > 0) {
          avgCycleDays = Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
        }
      }
    } catch (e) {
      // lead_status table might not exist - that's ok
      console.log('[Analytics] lead_status not available:', e)
    }

    // 6. Encontrar melhor horário
    let maxValue = 0
    let bestDay = 0
    let bestHour = 0
    
    for (let h = 0; h < heatMap.length; h++) {
      for (let d = 0; d < heatMap[h].length; d++) {
        if (heatMap[h][d] > maxValue) {
          maxValue = heatMap[h][d]
          bestDay = d
          bestHour = h
        }
      }
    }

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const hourLabels = ['6h', '9h', '12h', '15h', '18h', '21h']

    return NextResponse.json({
      success: true,
      data: {
        avgResponseTimeMinutes,
        avgCycleDays,
        heatMap,
        totalMessages: messages.length,
        analyzedConversations: conversationMap.size,
        bestTime: maxValue > 0 ? {
          day: dayNames[bestDay],
          hour: hourLabels[bestHour],
          count: maxValue
        } : null
      }
    })
  } catch (error: any) {
    console.error('[Analytics] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      data: {
        avgResponseTimeMinutes: null,
        avgCycleDays: null,
        heatMap: generateEmptyHeatMap(),
        totalMessages: 0,
        analyzedConversations: 0
      }
    })
  }
}

function generateEmptyHeatMap(): number[][] {
  return Array(6).fill(null).map(() => Array(7).fill(0))
}
