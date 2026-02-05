import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

type LeadStatus = 'novo' | 'em_contato' | 'negociando' | 'fechado' | 'perdido'

// GET - Buscar todos os status de leads
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { data, error } = await supabase
      .from('lead_status')
      .select('remote_jid, status, updated_at')
    
    if (error) {
      // Se a tabela não existir, retorna vazio (graceful degradation)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('[lead_status] Table not found, returning empty')
        return NextResponse.json({ success: true, statuses: {} })
      }
      throw error
    }

    // Converter para Map { remote_jid: status }
    const statuses: Record<string, LeadStatus> = {}
    for (const row of data || []) {
      statuses[row.remote_jid] = row.status as LeadStatus
    }

    return NextResponse.json({ success: true, statuses })
  } catch (error: any) {
    console.error('[lead_status] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Atualizar status de um lead
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { phone, status } = await request.json()

    if (!phone || !status) {
      return NextResponse.json({ error: 'phone and status required' }, { status: 400 })
    }

    // Validar status
    const validStatuses: LeadStatus[] = ['novo', 'em_contato', 'negociando', 'fechado', 'perdido']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Normalizar phone para JID
    const cleanPhone = phone.replace(/\D/g, '')
    const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`

    const { data, error } = await supabase
      .from('lead_status')
      .upsert({
        remote_jid: remoteJid,
        status,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'remote_jid',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      // Se a tabela não existir, apenas loga (frontend usa localStorage como fallback)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('[lead_status] Table not found, status not persisted')
        return NextResponse.json({ success: true, persisted: false })
      }
      throw error
    }

    return NextResponse.json({ success: true, persisted: true, data })
  } catch (error: any) {
    console.error('[lead_status] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Bulk update (sync múltiplos leads)
export async function PUT(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { leads } = await request.json()

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: 'leads array required' }, { status: 400 })
    }

    const records = leads.map((lead: { phone: string; status: LeadStatus }) => {
      const cleanPhone = lead.phone.replace(/\D/g, '')
      const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`
      return {
        remote_jid: remoteJid,
        status: lead.status,
        updated_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase
      .from('lead_status')
      .upsert(records, { 
        onConflict: 'remote_jid',
        ignoreDuplicates: false 
      })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('[lead_status] Table not found, bulk update not persisted')
        return NextResponse.json({ success: true, persisted: false, count: 0 })
      }
      throw error
    }

    return NextResponse.json({ success: true, persisted: true, count: records.length })
  } catch (error: any) {
    console.error('[lead_status] PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remover status de um lead
export async function DELETE(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'phone required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`

    const { error } = await supabase
      .from('lead_status')
      .delete()
      .eq('remote_jid', remoteJid)

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[lead_status] DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
