import pool from '../db/pool';

export interface ActivityLogRecord {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  created_at: Date;
}

export const ActivityLogModel = {
  async record(
    taskId: string,
    userId: string,
    action: string,
    changes?: Record<string, unknown>
  ): Promise<void> {
    await pool.query(
      `INSERT INTO activity_logs (task_id, user_id, action, changes) VALUES ($1, $2, $3, $4)`,
      [taskId, userId, action, changes ? JSON.stringify(changes) : null]
    );
  },

  async listForTask(taskId: string): Promise<ActivityLogRecord[]> {
    const { rows } = await pool.query<ActivityLogRecord>(
      `SELECT * FROM activity_logs WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId]
    );
    return rows;
  },
};
