UPDATE entity_definitions
SET schema = jsonb_set(
  schema,
  '{edges}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN edge->>'id' = 'fk-fk_skills_hunter_id'
        THEN jsonb_set(edge, '{data,inline}', 'true'::jsonb)
        WHEN edge->>'id' = 'fk-fk_awakenings_skill_id'
        THEN jsonb_set(edge, '{data,inline}', 'true'::jsonb)
        ELSE edge
      END
    )
    FROM jsonb_array_elements(schema->'edges') AS edge
  )
)
WHERE id = '559b71f4-ef62-41af-8002-85531dcf9767';