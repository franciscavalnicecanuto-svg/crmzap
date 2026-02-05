import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// ============ BUG #3 FIX: XSS Sanitization ============
function sanitizeMessage(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML entities to prevent XSS when content is displayed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Limit length to prevent DoS
    .slice(0, 10000)
}

// ============ BUG #6 FIX: Rate Limiting ============
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)
  
  // Clean up old entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetTime < now) rateLimitMap.delete(key)
    }
  }
  
  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS }
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }
  
  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check using IP or forwarded header
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown'
    
    const rateCheck = checkRateLimit(clientIp)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterMs: rateCheck.resetIn },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString(),
            'X-RateLimit-Remaining': '0',
          }
        }
      )
    }
    
    const { phone, message } = await request.json()

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      )
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Sanitize message for storage (BUG #3 fix)
    const sanitizedMessage = sanitizeMessage(message)

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Failed to send message', details: error },
        { status: response.status }
      )
    }

    const result = await response.json()
    const messageId = result.key?.id || `sent_${Date.now()}`
    
    // Salvar mensagem enviada no banco
    let dbSaved = false
    let dbError = null
    
    if (supabase) {
      try {
        const { error } = await supabase.from('messages').insert({
          id: messageId,
          instance_id: INSTANCE_NAME,
          remote_jid: `${cleanPhone}@s.whatsapp.net`,
          from_me: true,
          message_type: 'conversation',
          content: sanitizedMessage, // BUG #3: Use sanitized message for storage
          push_name: 'Você',
          timestamp: new Date().toISOString(),
        })
        
        if (error) {
          console.error('Supabase insert error:', error)
          dbError = error.message
        } else {
          dbSaved = true
        }
      } catch (dbErr: any) {
        console.error('Failed to save sent message to DB:', dbErr)
        dbError = dbErr?.message || 'Unknown error'
      }
    } else {
      dbError = 'Supabase not configured'
    }
    
    return NextResponse.json({
      success: true,
      messageId,
      status: result.status,
      dbSaved,
      dbError,
    })
  } catch (error: any) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    )
  }
}
