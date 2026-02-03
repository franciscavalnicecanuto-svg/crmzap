import { NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

export async function GET() {
  try {
    // Get QR Code from Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Evolution API error:', error)
      return NextResponse.json(
        { error: 'Falha ao gerar QR Code', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      qrcode: data.base64 || null,
      pairingCode: data.pairingCode || null,
      code: data.code || null,
      count: data.count || 0,
    })
  } catch (error: any) {
    console.error('QR Code error:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com Evolution API', details: error.message },
      { status: 500 }
    )
  }
}
