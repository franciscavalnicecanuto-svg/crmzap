import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

// Token secreto para operações destrutivas (opcional, pode ser setado no Vercel)
const ADMIN_SECRET = process.env.ADMIN_SECRET || null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // ========================================
    // 🛡️ PROTEÇÃO 1: Requer confirmação explícita
    // ========================================
    if (body.confirm !== true) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Operação destrutiva requer confirmação explícita',
          hint: 'Envie { "confirm": true } no body para confirmar o logout',
          warning: '⚠️ Isso vai desconectar o WhatsApp e exigir novo QR Code!'
        },
        { status: 400 }
      )
    }

    // ========================================
    // 🛡️ PROTEÇÃO 2: Token admin (se configurado)
    // ========================================
    if (ADMIN_SECRET) {
      const authHeader = request.headers.get('x-admin-secret')
      if (authHeader !== ADMIN_SECRET) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Token admin inválido ou ausente',
            hint: 'Envie header x-admin-secret com o token correto'
          },
          { status: 401 }
        )
      }
    }

    // ========================================
    // 🛡️ PROTEÇÃO 3: Log da operação
    // ========================================
    console.warn('⚠️ LOGOUT WHATSAPP INICIADO', {
      timestamp: new Date().toISOString(),
      instance: INSTANCE_NAME,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Logout from Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/logout/${INSTANCE_NAME}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Logout error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to logout' },
        { status: response.status }
      )
    }

    const data = await response.json()

    console.warn('✅ LOGOUT WHATSAPP CONCLUÍDO', {
      timestamp: new Date().toISOString(),
      instance: INSTANCE_NAME
    })

    return NextResponse.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso',
      data
    })
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
