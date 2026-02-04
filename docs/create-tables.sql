-- CRMZap - Tabelas para WhatsApp
-- Execute no Supabase Dashboard > SQL Editor

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  instance_id TEXT,
  remote_jid TEXT NOT NULL,
  from_me BOOLEAN DEFAULT false,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  push_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_remote_jid ON messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

-- Tabela de chats
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  instance_id TEXT,
  remote_jid TEXT UNIQUE,
  name TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_chats_remote_jid ON chats(remote_jid);

-- RLS (opcional mas recomendado)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy para permitir tudo via service key
CREATE POLICY "Service key full access" ON messages FOR ALL USING (true);
CREATE POLICY "Service key full access" ON chats FOR ALL USING (true);
