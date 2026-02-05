-- Tabela para persistir o status dos leads no kanban
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS lead_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remote_jid text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'novo',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index para busca rápida por remote_jid
CREATE INDEX IF NOT EXISTS idx_lead_status_remote_jid ON lead_status(remote_jid);

-- Index para busca por status
CREATE INDEX IF NOT EXISTS idx_lead_status_status ON lead_status(status);

-- Comentários
COMMENT ON TABLE lead_status IS 'Persiste o status do kanban de cada lead';
COMMENT ON COLUMN lead_status.remote_jid IS 'WhatsApp JID (ex: 5511999999999@s.whatsapp.net)';
COMMENT ON COLUMN lead_status.status IS 'Status: novo, em_contato, negociando, fechado, perdido';
