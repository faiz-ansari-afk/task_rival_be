import pool from '../db/pool';

export interface AttachmentRecord {
  id: string;
  task_id: string;
  user_id: string;
  public_id: string;
  resource_type: string;
  format: string | null;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  width: number | null;
  height: number | null;
  created_at: Date;
}

export interface CreateAttachmentInput {
  taskId: string;
  userId: string;
  publicId: string;
  resourceType: string;
  format: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  width: number | null;
  height: number | null;
}

export const AttachmentModel = {
  async create(input: CreateAttachmentInput): Promise<AttachmentRecord> {
    const { rows } = await pool.query<AttachmentRecord>(
      `INSERT INTO task_attachments
         (task_id, user_id, public_id, resource_type, format, original_name, mime_type, size_bytes, url, width, height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.taskId,
        input.userId,
        input.publicId,
        input.resourceType,
        input.format,
        input.originalName,
        input.mimeType,
        input.sizeBytes,
        input.url,
        input.width,
        input.height,
      ]
    );
    return rows[0];
  },

  async listForTask(taskId: string): Promise<AttachmentRecord[]> {
    const { rows } = await pool.query<AttachmentRecord>(
      `SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId]
    );
    return rows;
  },

  async countForTask(taskId: string): Promise<number> {
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM task_attachments WHERE task_id = $1`,
      [taskId]
    );
    return rows[0].count;
  },

  async findById(id: string): Promise<AttachmentRecord | null> {
    const { rows } = await pool.query<AttachmentRecord>(`SELECT * FROM task_attachments WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM task_attachments WHERE id = $1`, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  },
};
