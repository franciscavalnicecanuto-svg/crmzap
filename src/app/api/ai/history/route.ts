import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// GET /api/ai/history?phone=558596626767&limit=10
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  if (!phone) {
    return NextResponse.json({ error: 'Phone parameter required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('id, lead_name, stage, messages_count, analysis, model, duration_ms, created_at')
      .eq('lead_phone', phone)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          success: true, 
          analyses: [],
          message: 'Tabela de histórico ainda não criada'
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      analyses: data || [],
      total: data?.length || 0,
    })
  } catch (err: any) {
    console.error('History error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
