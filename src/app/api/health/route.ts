import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

// Telegram alert config (optional)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_ALERT_CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID || '831048149'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  whatsapp: {
    connected: boolean
    state: string
    lastCheck: string
    error?: string
  }
  database: {
    connected: boolean
    error?: string
  }
  alerts: {
    sent: boolean
    message?: string
  }
}

async function sendTelegramAlert(message: string) {
  if (!TELEGRAM_BOT_TOKEN) return false
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_ALERT_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    )
    return response.ok
  } catch (e) {
    console.error('[Health] Failed to send Telegram alert:', e)
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const alert = searchParams.get('alert') === 'true'
  
  const health: HealthStatus = {
    status: 'healthy',
    whatsapp: {
      connected: false,
      state: 'unknown',
      lastCheck: new Date().toISOString(),
    },
    database: {
      connected: false,
    },
    alerts: {
      sent: false,
    },
  }

  // 1. Check WhatsApp connection
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`,
      {
        headers: { 'apikey': EVOLUTION_API_KEY },
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      }
    )

    if (response.ok) {
      const data = await response.json()
      health.whatsapp.state = data.instance?.state || 'unknown'
      health.whatsapp.connected = data.instance?.state === 'open'
    } else {
      health.whatsapp.error = `HTTP ${response.status}`
      health.whatsapp.state = 'error'
    }
  } catch (e: any) {
    health.whatsapp.error = e.message || 'Connection failed'
    health.whatsapp.state = 'error'
  }

  // 2. Check database (Supabase)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY || '',
        },
        signal: AbortSignal.timeout(5000),
      })
      health.database.connected = response.ok
    }
  } catch (e: any) {
    health.database.error = e.message
  }

  // 3. Determine overall status
  if (!health.whatsapp.connected) {
    health.status = 'down'
  } else if (!health.database.connected) {
    health.status = 'degraded'
  }

  // 4. Send alert if requested and system is down
  if (alert && health.status === 'down') {
    const alertMessage = `🚨 <b>CRMzap ALERTA</b>

❌ WhatsApp DESCONECTADO!

<b>Estado:</b> ${health.whatsapp.state}
<b>Erro:</b> ${health.whatsapp.error || 'Sessão expirada'}
<b>Hora:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}

⚠️ <b>Ação necessária:</b> Reconecte o WhatsApp em:
https://whatszap-zeta.vercel.app/connect

Clientes podem estar perdendo mensagens!`

    const sent = await sendTelegramAlert(alertMessage)
    health.alerts.sent = sent
    health.alerts.message = alertMessage
  }

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
