import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// POST - Marcar contato como lido
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    // Formatar como JID do WhatsApp
    const cleanPhone = phone.replace(/\D/g, '')
    const remoteJid = `${cleanPhone}@s.whatsapp.net`

    // Tentar upsert na tabela read_status
    const { error } = await supabase
      .from('read_status')
      .upsert({
        remote_jid: remoteJid,
        last_read_at: new Date().toISOString(),
      }, {
        onConflict: 'remote_jid',
      })

    // Se a tabela não existir, apenas retorna sucesso (frontend usa localStorage como fallback)
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('read_status table not found, using localStorage fallback')
        return NextResponse.json({
          success: true,
          phone: cleanPhone,
          readAt: new Date().toISOString(),
          fallback: true,
        })
      }
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      readAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Mark as read error:', error)
    // Fallback - retorna sucesso mesmo com erro (frontend usa localStorage)
    return NextResponse.json({
      success: true,
      fallback: true,
    })
  }
}
