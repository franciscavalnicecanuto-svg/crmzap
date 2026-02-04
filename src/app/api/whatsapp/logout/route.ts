import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

export async function POST(request: NextRequest) {
  try {
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
