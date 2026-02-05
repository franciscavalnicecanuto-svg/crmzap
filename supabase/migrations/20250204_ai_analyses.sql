-- Tabela para histórico de análises de IA
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  stage TEXT NOT NULL DEFAULT 'novo',
  messages_count INTEGER NOT NULL DEFAULT 0,
  analysis TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'llama-3.1-70b',
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar análises por lead
CREATE INDEX IF NOT EXISTS idx_ai_analyses_lead_phone ON ai_analyses(lead_phone);

-- Índice para ordenar por data
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);

-- Comentários
COMMENT ON TABLE ai_analyses IS 'Histórico de análises de IA das conversas';
COMMENT ON COLUMN ai_analyses.lead_phone IS 'Telefone do lead (sem @s.whatsapp.net)';
COMMENT ON COLUMN ai_analyses.stage IS 'Estágio do lead no momento da análise';
COMMENT ON COLUMN ai_analyses.duration_ms IS 'Tempo de geração em milissegundos';
