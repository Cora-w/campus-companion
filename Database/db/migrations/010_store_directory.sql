-- Store directory presentation fields. Existing row permissions remain in force.
ALTER TABLE app.stores
  ADD COLUMN seed_key text UNIQUE,
  ADD COLUMN place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  ADD COLUMN category text NOT NULL DEFAULT '',
  ADD COLUMN floor smallint CHECK (floor > 0),
  ADD COLUMN room_number text NOT NULL DEFAULT '',
  ADD COLUMN cover_url text NOT NULL DEFAULT '',
  ADD COLUMN image_credit jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(image_credit) = 'object'),
  ADD COLUMN source_note text NOT NULL DEFAULT '';
CREATE INDEX stores_place_idx ON app.stores(place_id);

CREATE OR REPLACE VIEW app.public_stores WITH (security_barrier=true) AS
  SELECT id,name,store_type,description,location,
    place_id,category,floor,room_number,cover_url,image_credit,source_note
  FROM app.stores WHERE status='open';
COMMENT ON COLUMN app.stores.cover_url IS 'Illustrative image URL; consult image_credit before presenting as a storefront photograph.';
COMMENT ON COLUMN app.stores.seed_key IS 'Stable import identifier; not a merchant identity or account.';
