UPDATE entity_definitions
SET schema = jsonb_set(
  schema,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN node->>'id' = 'node-hunters'
        THEN jsonb_set(node, '{data,publicPage}', 'true')
        ELSE jsonb_set(node, '{data,publicPage}', 'false')
      END
    )
    FROM jsonb_array_elements(schema->'nodes') AS node
  )
),
updated_at = now()
WHERE id = '559b71f4-ef62-41af-8002-85531dcf9767';