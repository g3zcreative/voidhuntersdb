
-- Add missing archetype "Warden"
INSERT INTO archetypes (name, slug) VALUES ('Warden', 'warden')
ON CONFLICT DO NOTHING;

-- Backfill faction_id from element text
UPDATE heroes h
SET faction_id = f.id
FROM factions f
WHERE LOWER(h.element) = LOWER(f.name)
  AND h.faction_id IS NULL;

-- Backfill archetype_id from class_type text
UPDATE heroes h
SET archetype_id = a.id
FROM archetypes a
WHERE LOWER(h.class_type) = LOWER(a.name)
  AND h.archetype_id IS NULL;
