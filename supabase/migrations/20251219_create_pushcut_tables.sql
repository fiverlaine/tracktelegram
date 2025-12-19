-- ============================================
-- Migration: Create Pushcut Integration Tables
-- Date: 2025-12-19
-- Description: Adiciona tabelas para integração com Pushcut (notificações push)
-- ============================================

-- Tabela para armazenar a configuração do Pushcut do usuário
CREATE TABLE IF NOT EXISTS pushcut_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    notification_name TEXT NOT NULL DEFAULT 'TrackGram',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Tabela para armazenar as configurações de notificação por evento
CREATE TABLE IF NOT EXISTS pushcut_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES pushcut_integrations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('new_lead', 'member_join', 'member_leave', 'pageview', 'click', 'join_request')),
    enabled BOOLEAN DEFAULT true,
    title_template TEXT NOT NULL DEFAULT 'TrackGram - Novo Evento',
    text_template TEXT NOT NULL DEFAULT 'Um novo evento foi registrado.',
    sound TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(integration_id, event_type)
);

-- Tabela para log de notificações enviadas (auditoria)
CREATE TABLE IF NOT EXISTS pushcut_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES pushcut_integrations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT,
    text TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pushcut_integrations_user_id ON pushcut_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_pushcut_notifications_integration_id ON pushcut_notifications(integration_id);
CREATE INDEX IF NOT EXISTS idx_pushcut_notifications_event_type ON pushcut_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_pushcut_logs_integration_id ON pushcut_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_pushcut_logs_created_at ON pushcut_logs(created_at);

-- RLS
ALTER TABLE pushcut_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pushcut_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pushcut_logs ENABLE ROW LEVEL SECURITY;

-- Policies para pushcut_integrations
CREATE POLICY "Users can view own pushcut integrations" ON pushcut_integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pushcut integrations" ON pushcut_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pushcut integrations" ON pushcut_integrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pushcut integrations" ON pushcut_integrations
    FOR DELETE USING (auth.uid() = user_id);

-- Policies para pushcut_notifications (baseado na integração do usuário)
CREATE POLICY "Users can view own pushcut notifications" ON pushcut_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pushcut_integrations pi 
            WHERE pi.id = pushcut_notifications.integration_id 
            AND pi.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own pushcut notifications" ON pushcut_notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pushcut_integrations pi 
            WHERE pi.id = pushcut_notifications.integration_id 
            AND pi.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own pushcut notifications" ON pushcut_notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pushcut_integrations pi 
            WHERE pi.id = pushcut_notifications.integration_id 
            AND pi.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own pushcut notifications" ON pushcut_notifications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pushcut_integrations pi 
            WHERE pi.id = pushcut_notifications.integration_id 
            AND pi.user_id = auth.uid()
        )
    );

-- Policies para pushcut_logs
CREATE POLICY "Users can view own pushcut logs" ON pushcut_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pushcut_integrations pi 
            WHERE pi.id = pushcut_logs.integration_id 
            AND pi.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert pushcut logs" ON pushcut_logs
    FOR INSERT WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pushcut_integrations_updated_at ON pushcut_integrations;
CREATE TRIGGER update_pushcut_integrations_updated_at 
    BEFORE UPDATE ON pushcut_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pushcut_notifications_updated_at ON pushcut_notifications;
CREATE TRIGGER update_pushcut_notifications_updated_at 
    BEFORE UPDATE ON pushcut_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
