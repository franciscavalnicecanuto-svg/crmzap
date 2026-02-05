import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usando OpenRouter para acessar modelos variados incluindo Kimi
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = 'moonshotai/kimi-k2' // Kimi K2 - modelo avançado de análise

// Fallback para NVIDIA se OpenRouter não configurado
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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'
const FALLBACK_MODEL = 'meta/llama-3.1-70b-instruct'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Função para gerar prompt personalizado baseado no contexto real
function generatePersonalizedPrompt(stage: string, leadName: string, conversationText: string): string {
  const baseContext = `
CONTEXTO DO LEAD:
- Nome: ${leadName || 'Não identificado'}
- Estágio atual: ${stage}

INSTRUÇÕES CRÍTICAS:
1. Analise SOMENTE o que está EXPLÍCITO na conversa - não invente informações
2. Cite TRECHOS EXATOS das mensagens entre aspas para justificar cada ponto
3. Se algo não foi mencionado, diga "Não identificado na conversa"
4. Seja ESPECÍFICO para este lead - evite frases genéricas
5. Use o NOME do lead nas sugestões de mensagem
`

  const stagePrompts: Record<string, string> = {
    novo: `${baseContext}

Você é um analista de vendas. Analise esta conversa inicial com ${leadName || 'o lead'}.

## ANÁLISE PERSONALIZADA:

### 1. 👤 QUEM É ${(leadName || 'O LEAD').toUpperCase()}?
Baseado APENAS no que foi dito:
- O que sabemos sobre essa pessoa? (cite mensagens)
- Qual o contexto/situação dela?
- Como ela se comunica? (formal/informal, direto/detalhista)

### 2. 🎯 O QUE ELE QUER?
- Qual problema ou necessidade foi mencionado? (cite a mensagem exata)
- O que motivou o contato?
- Há urgência? Por quê?

### 3. 🔍 INFORMAÇÕES QUE FALTAM
Liste 3-5 perguntas específicas que precisamos fazer para qualificar ${leadName || 'este lead'}.

### 4. 💬 MENSAGEM PERSONALIZADA
Escreva UMA mensagem de follow-up natural, usando:
- O nome ${leadName || 'do lead'}
- Referência ao que ele disse
- Uma pergunta de qualificação

### 5. ⚡ AÇÃO IMEDIATA
O que fazer AGORA? Seja específico.

Português brasileiro. Seja conciso e acionável.`,

    em_contato: `${baseContext}

Você é um estrategista de vendas. Analise esta conversa em andamento com ${leadName || 'o lead'}.

## ANÁLISE DETALHADA:

### 1. 📊 RESUMO DA CONVERSA
Em 2-3 frases, o que aconteceu até agora com ${leadName || 'este lead'}?

### 2. 🎯 NECESSIDADES IDENTIFICADAS
Para cada necessidade, cite a mensagem que revela isso:
| Necessidade | Evidência (trecho da conversa) | Prioridade |
|------------|-------------------------------|------------|

### 3. 🚧 OBJEÇÕES/PREOCUPAÇÕES
O que ${leadName || 'o lead'} demonstrou como barreira? Cite trechos.

### 4. 💡 GATILHOS IDENTIFICADOS
O que parece motivar ${leadName || 'o lead'}? (cite evidências)

### 5. 📝 PRÓXIMA MENSAGEM
Escreva a mensagem ideal para avançar, considerando:
- Personalização com nome e contexto
- Resposta a alguma preocupação demonstrada
- Call-to-action claro

### 6. 📈 PROBABILIDADE DE CONVERSÃO
X% - Justifique com base na conversa.

Português brasileiro.`,

    negociando: `${baseContext}

Você é um closer especialista. ${leadName || 'O lead'} está na fase de negociação.

## ANÁLISE DE FECHAMENTO:

### 1. 🎯 ONDE ESTAMOS?
- Qual foi a última interação relevante? (cite)
- O que ${leadName || 'o lead'} precisa para fechar?

### 2. 🛡️ OBJEÇÕES MAPEADAS
Para cada objeção identificada na conversa:
| Objeção (citação) | Tipo | Script de Resposta |
|------------------|------|-------------------|

### 3. 🔥 ARGUMENTOS PERSONALIZADOS
5 argumentos específicos para ${leadName || 'este lead'}, baseados no que ele disse valorizar:

### 4. 📱 SCRIPTS PRONTOS (personalizados para ${leadName || 'o lead'})

**Follow-up (se não responder):**
"..."

**Fechamento direto:**
"..."

**Criar urgência:**
"..."

**Se pedir desconto:**
"..."

### 5. ⏰ AÇÃO NOS PRÓXIMOS 30 MIN
O que fazer AGORA para fechar ${leadName || 'este lead'}?

Português brasileiro. Seja direto.`,

    fechado: `${baseContext}

Esta venda foi fechada! Analise para extrair aprendizados.

## PÓS-VENDA:

### 1. ✅ O QUE FUNCIONOU?
Quais abordagens/argumentos converteram ${leadName || 'o lead'}?

### 2. 📊 PERFIL DO COMPRADOR
Como era ${leadName || 'este cliente'}? (para replicar)

### 3. 🔄 OPORTUNIDADES
- Upsell/cross-sell possível?
- Indicações?

### 4. 💬 MENSAGEM DE ONBOARDING
Mensagem de boas-vindas personalizada para ${leadName || 'o cliente'}.

Português brasileiro.`,

    perdido: `${baseContext}

O lead foi perdido. Analise para aprender e possivelmente recuperar.

## ANÁLISE DE PERDA:

### 1. ❌ ONDE PERDEMOS?
Em que momento a conversa esfriou? (cite mensagens)

### 2. 🔍 MOTIVO PROVÁVEL
Baseado na conversa, por que ${leadName || 'o lead'} não avançou?

### 3. 🔄 RECUPERÁVEL?
Há chance de reativar? O que precisaria mudar?

### 4. 💬 MENSAGEM DE REATIVAÇÃO
Uma última tentativa personalizada para ${leadName || 'o lead'}:

### 5. 📚 LIÇÃO APRENDIDA
O que fazer diferente na próxima vez?

Português brasileiro.`,
  }

  return stagePrompts[stage] || stagePrompts.negociando
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { messages, stage, leadPhone, leadName } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Mensagens inválidas' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const limitedMessages = messages.slice(-50)

    // Formata a conversa com timestamps e contexto
    const conversationText = limitedMessages
      .map((m: { role: string; content: string }, idx: number) => {
        const speaker = m.role === 'user' ? `👤 ${leadName || 'LEAD'}` : '💼 VOCÊ'
        return `[${idx + 1}] ${speaker}: "${m.content}"`
      })
      .join('\n\n')

    // Gera prompt personalizado baseado no estágio e contexto
    const systemPrompt = generatePersonalizedPrompt(stage || 'novo', leadName || '', conversationText)

    const userPrompt = `## CONVERSA COM ${(leadName || 'O LEAD').toUpperCase()}:

${conversationText}

---
IMPORTANTE: 
- Cite números das mensagens [X] ao referenciar o que foi dito
- Use "${leadName || 'o lead'}" nas sugestões, não termos genéricos
- Se algo não foi mencionado na conversa, diga "Não identificado"
- Cada insight deve ter uma citação da conversa como evidência

---
## 🏷️ TAGS SUGERIDAS (OBRIGATÓRIO)
No FINAL da sua análise, inclua esta seção EXATAMENTE neste formato:

**TAGS_JSON:**
\`\`\`json
{
  "interesse": "Alto" | "Médio" | "Baixo" | null,
  "objecao": "Preço" | "Prazo" | null,
  "urgente": true | false,
  "vip": true | false
}
\`\`\`

Baseie as tags em:
- interesse: Alta se demonstra vontade de fechar, Média se ainda está avaliando, Baixa se parece desinteressado
- objecao: Preço se mencionou custo/valor, Prazo se mencionou tempo/demora
- urgente: true se há deadline ou pressa mencionados
- vip: true se parece ser cliente de alto ticket ou referência`

    // Create streaming response
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = ''
        let tokensUsed = 0
        
        try {
          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            percent: 5, 
            message: 'Conectando à IA...' 
          })}\n\n`))

          // Decide qual API usar: OpenRouter (Kimi) ou NVIDIA (fallback)
          const useOpenRouter = !!OPENROUTER_API_KEY
          const apiUrl = useOpenRouter ? OPENROUTER_API_URL : NVIDIA_API_URL
          const apiKey = useOpenRouter ? OPENROUTER_API_KEY : NVIDIA_API_KEY
          const modelToUse = useOpenRouter ? MODEL : FALLBACK_MODEL

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'text/event-stream',
              ...(useOpenRouter && {
                'HTTP-Referer': 'https://whatszap-zeta.vercel.app',
                'X-Title': 'CRMzap CRM',
              }),
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 4096,
              temperature: 0.7,
              top_p: 0.9,
              stream: true,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('NVIDIA API error:', errorText)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              message: 'Falha ao conectar com a IA' 
            })}\n\n`))
            controller.close()
            return
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            percent: 15, 
            message: 'Analisando conversa...' 
          })}\n\n`))

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No reader')

          const decoder = new TextDecoder()
          let buffer = ''
          let chunkCount = 0
          const estimatedChunks = 100 // Estimativa de chunks para o progresso

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullContent += content
                    chunkCount++
                    
                    // Calculate progress (15% start, 90% end for content)
                    const contentProgress = Math.min(90, 15 + (chunkCount / estimatedChunks) * 75)
                    
                    // Send content chunk with progress
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'content', 
                      content,
                      percent: Math.round(contentProgress),
                    })}\n\n`))
                  }
                  
                  // Track tokens
                  if (parsed.usage) {
                    tokensUsed = parsed.usage.total_tokens || 0
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            percent: 95, 
            message: 'Salvando análise...' 
          })}\n\n`))

          // Save to history
          const durationMs = Date.now() - startTime
          if (supabase && leadPhone && fullContent) {
            try {
              await supabase.from('ai_analyses').insert({
                lead_phone: leadPhone,
                lead_name: leadName || null,
                stage: stage || 'novo',
                messages_count: limitedMessages.length,
                analysis: fullContent,
                model: modelToUse,
                tokens_used: tokensUsed,
                duration_ms: durationMs,
              })
            } catch (dbError) {
              console.error('Failed to save analysis:', dbError)
              // Don't fail the request, just log
            }
          }

          // Send complete event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            percent: 100,
            analysis: fullContent,
            durationMs,
            tokensUsed,
          })}\n\n`))

        } catch (error: any) {
          console.error('Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error.message || 'Erro ao gerar análise' 
          })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    console.error('Analysis error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
