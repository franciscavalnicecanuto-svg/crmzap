import { NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

export async function POST() {
  try {
    // Get all contacts from Evolution API (POST request)
    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/findContacts/${INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Falha ao buscar contatos', details: error },
        { status: response.status }
      )
    }

    const contacts = await response.json()
    
    // Filter only individual contacts (not groups)
    const individualContacts = contacts.filter((contact: any) => 
      contact.remoteJid && 
      !contact.remoteJid.includes('@g.us') &&
      !contact.isGroup &&
      contact.remoteJid.includes('@s.whatsapp.net')
    )

    // Transform to leads format
    const leads = individualContacts.map((contact: any) => {
      const phone = contact.remoteJid?.split('@')[0] || ''
      return {
        id: `wa_${phone}`,
        name: contact.pushName || phone,
        phone: phone,
        whatsappId: contact.remoteJid,
        profilePicUrl: contact.profilePicUrl || null,
        source: 'whatsapp',
        status: 'novo',
        tags: ['whatsapp'],
        createdAt: contact.createdAt || new Date().toISOString(),
        updatedAt: contact.updatedAt || new Date().toISOString(),
      }
    })

    // Sort by name
    leads.sort((a: any, b: any) => {
      return (a.name || '').localeCompare(b.name || '')
    })

    return NextResponse.json({
      success: true,
      leads,
      total: leads.length,
      message: `${leads.length} contatos encontrados para importar`,
    })
  } catch (error: any) {
    console.error('Import contacts error:', error)
    return NextResponse.json(
      { error: 'Erro ao importar contatos', details: error.message },
      { status: 500 }
    )
  }
}
