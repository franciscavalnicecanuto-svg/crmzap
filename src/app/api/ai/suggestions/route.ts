import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// Fast model for quick suggestions
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { messages, leadName } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ suggestions: [], intent: null })
    }

    // Get last 5 messages for context
    const recentMessages = messages.slice(-5)
    const lastMessage = recentMessages[recentMessages.length - 1]
    
    const conversationText = recentMessages
      .map((m: Message) => `${m.role === 'user' ? 'Cliente' : 'Você'}: ${m.content}`)
      .join('\n')

    const prompt = `Você é um assistente de vendas brasileiro. Analise esta conversa e responda em JSON.

CONVERSA:
${conversationText}

TAREFA:
1. Identifique a INTENÇÃO do cliente na última mensagem (preço, dúvida, objeção, interesse, fechamento, saudação, outro)
2. Sugira 3 respostas curtas e naturais para dar continuidade

RESPONDA APENAS COM JSON (sem markdown):
{
  "intent": "preço|dúvida|objeção|interesse|fechamento|saudação|outro",
  "intentLabel": "Descrição curta da intenção",
  "suggestions": [
    "Sugestão 1 (máx 100 chars)",
    "Sugestão 2 (máx 100 chars)", 
    "Sugestão 3 (máx 100 chars)"
  ]
}

Use o nome "${leadName || 'o cliente'}" nas sugestões quando apropriado.
Seja natural, como um vendedor brasileiro falaria no WhatsApp.`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://crmzap.com.br',
        'X-Title': 'CRMzap'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      console.error('AI API error:', response.status)
      return NextResponse.json({ suggestions: [], intent: null })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response
    try {
      // Clean up response - remove markdown if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(jsonStr)
      
      return NextResponse.json({
        intent: parsed.intent || null,
        intentLabel: parsed.intentLabel || null,
        suggestions: parsed.suggestions || []
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json({ suggestions: [], intent: null })
    }
  } catch (error) {
    console.error('Suggestions API error:', error)
    return NextResponse.json({ suggestions: [], intent: null })
  }
}
