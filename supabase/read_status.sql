-- Tabela para rastrear última leitura de cada contato
CREATE TABLE IF NOT EXISTS read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  remote_jid TEXT NOT NULL UNIQUE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_read_status_remote_jid ON read_status(remote_jid);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_read_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_read_status ON read_status;
CREATE TRIGGER trigger_update_read_status
  BEFORE UPDATE ON read_status
  FOR EACH ROW
  EXECUTE FUNCTION update_read_status_updated_at();
