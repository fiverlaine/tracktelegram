-- =====================================================
-- MIGRAÇÃO: Adicionar métricas de únicos ao Dashboard
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Atualizar função get_dashboard_metrics para incluir contagens de únicos
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_funnel_id UUID DEFAULT NULL,
  p_pixel_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_events AS (
    SELECT 
      e.event_type,
      e.visitor_id,
      e.created_at,
      DATE(e.created_at AT TIME ZONE 'America/Sao_Paulo') as event_date
    FROM events e
    WHERE e.created_at BETWEEN p_start_date AND p_end_date
      AND (p_funnel_id IS NULL OR e.funnel_id = p_funnel_id)
      AND (
        p_pixel_id IS NULL 
        OR e.funnel_id IN (
          SELECT DISTINCT f.id FROM funnels f
          JOIN pixels p ON f.user_id = p.user_id
          WHERE p.id = p_pixel_id
        )
      )
  ),
  
  -- Totais gerais
  totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END), 0) as pageviews,
      COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
      COALESCE(SUM(CASE WHEN event_type IN ('join', 'lead') THEN 1 ELSE 0 END), 0) as joins,
      COALESCE(SUM(CASE WHEN event_type = 'leave' THEN 1 ELSE 0 END), 0) as leaves,
      -- Únicos (por visitor_id)
      COALESCE(COUNT(DISTINCT CASE WHEN event_type = 'pageview' THEN visitor_id END), 0) as unique_pageviews,
      COALESCE(COUNT(DISTINCT CASE WHEN event_type IN ('join', 'lead') THEN visitor_id END), 0) as unique_joins,
      COALESCE(COUNT(DISTINCT CASE WHEN event_type = 'leave' THEN visitor_id END), 0) as unique_leaves
    FROM filtered_events
  ),
  
  -- Dados diários
  daily AS (
    SELECT
      event_date as date,
      COALESCE(SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END), 0) as pageviews,
      COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
      COALESCE(SUM(CASE WHEN event_type IN ('join', 'lead') THEN 1 ELSE 0 END), 0) as joins,
      COALESCE(SUM(CASE WHEN event_type = 'leave' THEN 1 ELSE 0 END), 0) as leaves
    FROM filtered_events
    GROUP BY event_date
    ORDER BY event_date
  )
  
  SELECT json_build_object(
    'totals', (SELECT row_to_json(t) FROM totals t),
    'daily', (SELECT COALESCE(json_agg(d), '[]'::json) FROM daily d)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.get_dashboard_metrics IS 'Retorna métricas do dashboard incluindo totais, únicos e dados diários';
