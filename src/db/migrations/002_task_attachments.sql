-- 002_task_attachments.sql
-- Adds support for multiple file attachments per task, stored on Cloudinary.

CREATE TABLE IF NOT EXISTS task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Cloudinary identifiers, needed to manage (e.g. delete) the asset later.
  public_id     TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'raw'
  format        TEXT,

  -- Display / download metadata.
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  url           TEXT NOT NULL,             -- secure_url from Cloudinary
  width         INTEGER,
  height        INTEGER,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
