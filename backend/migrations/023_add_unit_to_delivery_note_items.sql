-- Keep delivery-note item units in sync with the API payload.
-- Existing databases created before this column was introduced are upgraded safely.
ALTER TABLE delivery_note_items
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
