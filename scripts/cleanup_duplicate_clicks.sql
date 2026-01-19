-- =====================================================
-- LIMPEZA DE CLICKS DUPLICADOS - TrackGram
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Primeiro, vamos ver quantos duplicados existem
SELECT 
    visitor_id,
    funnel_id,
    DATE(created_at) as event_date,
    COUNT(*) as click_count
FROM events
WHERE event_type = 'click'
GROUP BY visitor_id, funnel_id, DATE(created_at)
HAVING COUNT(*) > 1
ORDER BY click_count DESC
LIMIT 20;

-- 2. Criar tabela temporária com os IDs que devemos MANTER (o primeiro click de cada grupo)
CREATE TEMP TABLE clicks_to_keep AS
SELECT DISTINCT ON (visitor_id, funnel_id, DATE(created_at))
    id
FROM events
WHERE event_type = 'click'
ORDER BY visitor_id, funnel_id, DATE(created_at), created_at ASC;

-- 3. Ver quantos clicks serão deletados
SELECT 
    (SELECT COUNT(*) FROM events WHERE event_type = 'click') as total_clicks,
    (SELECT COUNT(*) FROM clicks_to_keep) as clicks_to_keep,
    (SELECT COUNT(*) FROM events WHERE event_type = 'click') - (SELECT COUNT(*) FROM clicks_to_keep) as clicks_to_delete;

-- 4. DELETAR os clicks duplicados (mantém apenas o primeiro de cada dia por visitor+funnel)
-- ⚠️ CUIDADO: Execute apenas se os números acima fizerem sentido!
DELETE FROM events
WHERE event_type = 'click'
AND id NOT IN (SELECT id FROM clicks_to_keep);

-- 5. Limpar tabela temporária
DROP TABLE IF EXISTS clicks_to_keep;

-- 6. Verificar resultado final
SELECT 
    event_type,
    COUNT(*) as total
FROM events
WHERE event_type IN ('pageview', 'click', 'join')
GROUP BY event_type
ORDER BY event_type;
