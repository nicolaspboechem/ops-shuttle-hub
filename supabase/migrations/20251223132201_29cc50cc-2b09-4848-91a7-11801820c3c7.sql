-- Add column to control public visibility of events
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS visivel_publico BOOLEAN DEFAULT true;