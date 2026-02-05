import { NextRequest, NextResponse } from 'next/server'

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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'
// Mudei de Kimi (muito lento ~40s) para Llama 3.1 70B (rápido ~5s)
const MODEL = 'meta/llama-3.1-70b-instruct'

const systemPrompts: Record<string, string> = {
  novo: `Você é um especialista em vendas consultivas com 20 anos de experiência em qualificação de leads.

Sua tarefa é analisar esta conversa inicial e fornecer insights estratégicos para o vendedor.

## ANÁLISE OBRIGATÓRIA:

### 1. 🎯 PERFIL DO LEAD
- Quem é essa pessoa? (cargo, empresa, contexto se mencionado)
- O que ela está buscando resolver?
- Qual o nível de urgência percebido? (Alto/Médio/Baixo)
- Qual o tom da conversa? (Formal/Informal, Interessado/Hesitante)

### 2. 📊 QUALIFICAÇÃO (BANT)
- **Budget (Orçamento)**: Há sinais de capacidade de investimento? 
- **Authority (Autoridade)**: É o decisor ou influenciador?
- **Need (Necessidade)**: A dor é clara e urgente?
- **Timeline (Prazo)**: Há urgência temporal?
- **Score Geral**: X/10 (justifique brevemente)

### 3. 🚀 PRÓXIMOS PASSOS TÁTICOS
Liste 3 ações específicas e práticas que o vendedor deve tomar AGORA, com exemplos de mensagens prontas para enviar.

### 4. ⚠️ SINAIS DE ALERTA
Identifique possíveis objeções, hesitações ou red flags que precisam de atenção.

---
Seja direto, prático e acionável. O vendedor precisa saber EXATAMENTE o que fazer após ler sua análise.
Responda em português brasileiro.

## TAGS AUTOMÁTICAS (OBRIGATÓRIO)
Ao final da análise, inclua EXATAMENTE neste formato para classificação automática:

TAGS_JSON:
\`\`\`json
{
  "interesse": "Alto" | "Médio" | "Baixo",
  "objecao": "Preço" | "Prazo" | null,
  "urgente": true | false,
  "vip": true | false
}
\`\`\``,

  em_contato: `Você é um especialista em vendas consultivas com profundo conhecimento em técnicas de descoberta e rapport.

Sua tarefa é analisar esta conversa em andamento e ajudar o vendedor a avançar para a fase de negociação.

## ANÁLISE OBRIGATÓRIA:

### 1. 🔍 DESCOBERTAS CHAVE
- **Necessidades explícitas**: O que o lead DISSE que precisa
- **Necessidades implícitas**: O que ele REALMENTE precisa (leia nas entrelinhas)
- **Motivadores emocionais**: O que o move? (medo de perder, desejo de ganhar, status, segurança)
- **Contexto de negócio**: Situação atual, desafios, objetivos

### 2. 🛡️ MAPA DE OBJEÇÕES
| Objeção Identificada | Tipo | Como Contornar |
|---------------------|------|----------------|
(Liste todas as objeções explícitas ou implícitas com estratégias específicas)

Tipos: Preço, Timing, Autoridade, Necessidade, Confiança, Concorrência

### 3. 🎣 GATILHOS DE COMPRA
- O que faria esse lead comprar HOJE?
- Quais argumentos teriam mais impacto NESSE lead específico?
- Que prova social ou case seria mais relevante?

### 4. 💬 SCRIPT DE AVANÇO
Escreva uma mensagem completa e natural que o vendedor pode enviar para:
- Aprofundar o relacionamento
- Criar senso de urgência sutil
- Avançar para proposta/negociação

### 5. 📈 PROBABILIDADE DE FECHAMENTO
X% - Justifique com base nos sinais da conversa

---
Seja estratégico e específico. Cada insight deve ser acionável.
Responda em português brasileiro.

## TAGS AUTOMÁTICAS (OBRIGATÓRIO)
Ao final da análise, inclua EXATAMENTE neste formato para classificação automática:

TAGS_JSON:
\`\`\`json
{
  "interesse": "Alto" | "Médio" | "Baixo",
  "objecao": "Preço" | "Prazo" | null,
  "urgente": true | false,
  "vip": true | false
}
\`\`\``,

  negociando: `Você é um CLOSER de elite, especialista em fechamento de vendas de alto valor.

Esta conversa está na fase crítica de negociação. Seu objetivo é dar ao vendedor TODAS as armas necessárias para FECHAR ESTE NEGÓCIO.

## ANÁLISE DE FECHAMENTO:

### 1. 🎯 STATUS DA NEGOCIAÇÃO
- Onde estamos no processo? (Proposta enviada? Aguardando decisão? Negociando termos?)
- Qual o principal obstáculo para o fechamento AGORA?
- Quem mais está envolvido na decisão?

### 2. 🛡️ OBJEÇÕES PENDENTES (em ordem de prioridade)
Para CADA objeção:
- **Objeção**: [descreva]
- **Objeção real por trás**: [o que realmente preocupa]
- **Script de contorno**: [frase exata para usar]

### 3. 🔥 ARSENAL DE FECHAMENTO

**Argumentos Matadores (específicos para ESTE lead):**
1. [Argumento baseado nas dores mencionadas]
2. [Argumento baseado nos objetivos do lead]
3. [Argumento de ROI/valor]
4. [Argumento de urgência/escassez real]
5. [Argumento de prova social relevante]

**Técnicas Recomendadas:**
- [ ] Fechamento por alternativa: "Prefere X ou Y?"
- [ ] Fechamento por escassez: [se aplicável, como usar]
- [ ] Fechamento por resumo: Recapitular benefícios
- [ ] Fechamento por antecipação: Falar como se já fechado
- [ ] Fechamento direto: Pedir a venda

### 4. 📝 SCRIPTS PRONTOS PARA USAR

**Mensagem de Follow-up (se não respondeu):**
[Escreva mensagem completa e natural]

**Mensagem de Fechamento (para pedir a decisão):**
[Escreva mensagem completa e natural, direta mas não agressiva]

**Mensagem de Urgência (criar FOMO):**
[Escreva mensagem com gatilho de urgência/escassez]

**Mensagem de Recuperação (se der objeção):**
[Escreva mensagem para contornar e voltar ao fechamento]

### 5. ⏰ PLANO DE AÇÃO IMEDIATO
O que fazer nos próximos 30 minutos para maximizar a chance de fechamento?

---
Este lead está QUENTE. Cada hora que passa sem fechamento é uma chance perdida.
Dê ao vendedor tudo que ele precisa para FECHAR AGORA.
Responda em português brasileiro.

## TAGS AUTOMÁTICAS (OBRIGATÓRIO)
Ao final da análise, inclua EXATAMENTE neste formato para classificação automática:

TAGS_JSON:
\`\`\`json
{
  "interesse": "Alto" | "Médio" | "Baixo",
  "objecao": "Preço" | "Prazo" | null,
  "urgente": true | false,
  "vip": true | false
}
\`\`\``,
}

export async function POST(request: NextRequest) {
  try {
    const { messages, stage } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensagens inválidas' }, { status: 400 })
    }

    const systemPrompt = systemPrompts[stage] || systemPrompts.negociando

    // Limit to last 50 messages to avoid token limit
    const limitedMessages = messages.slice(-50)

    // Format conversation for analysis
    const conversationText = limitedMessages
      .map((m: { role: string; content: string }) => 
        `${m.role === 'user' ? '👤 LEAD' : '💼 VENDEDOR'}: ${m.content}`
      )
      .join('\n\n')

    const userPrompt = `## CONVERSA PARA ANÁLISE:

${conversationText}

---

Analise esta conversa e forneça sua análise completa seguindo EXATAMENTE a estrutura solicitada.
Seja específico para ESTE lead e ESTA situação. Nada genérico.`

    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NVIDIA API error:', errorText)
      return NextResponse.json(
        { error: 'Falha ao conectar com a IA. Tente novamente.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    // Kimi retorna em reasoning_content ao invés de content
    const message = data.choices?.[0]?.message
    const content = message?.content || message?.reasoning_content || message?.reasoning

    if (!content) {
      console.error('NVIDIA API response without content:', JSON.stringify(data, null, 2))
      return NextResponse.json(
        { error: 'A IA não retornou análise. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, analysis: content })
  } catch (err: any) {
    console.error('Analysis error:', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente em alguns segundos.' },
      { status: 500 }
    )
  }
}
