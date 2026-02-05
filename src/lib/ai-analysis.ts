// AI Analysis - Client-side wrapper (calls server API)

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function analyzeConversation(
  messages: Message[],
  stage: string
): Promise<{ analysis: string } | { error: string }> {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, stage }),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      return { error: data.error || 'Falha ao analisar conversa' }
    }

    return { analysis: data.analysis }
  } catch (err: any) {
    console.error('Analysis error:', err)
    return { error: 'Erro de conexão. Verifique sua internet.' }
  }
}
