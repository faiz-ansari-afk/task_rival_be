import pool from '../db/pool';
import { ListTasksQuery, CreateTaskInput, UpdateTaskInput } from '../validators/taskValidators';

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date: Date | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  dueDate: 'due_date',
  priority: "CASE priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 END",
  createdAt: 'created_at',
};

export const TaskModel = {
  async create(userId: string, input: CreateTaskInput): Promise<TaskRecord> {
    const { rows } = await pool.query<TaskRecord>(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
       VALUES ($1, $2, COALESCE($3::task_status, 'TODO'), COALESCE($4::task_priority, 'MEDIUM'), $5, $6)
       RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.status ?? null,
        input.priority ?? null,
        input.dueDate ?? null,
        userId,
      ]
    );
    return rows[0];
  },

  async findById(id: string): Promise<TaskRecord | null> {
    const { rows } = await pool.query<TaskRecord>(`SELECT * FROM tasks WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async list(
    userId: string | null,
    query: ListTasksQuery
  ): Promise<{ tasks: TaskRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (userId !== null) {
      params.push(userId);
      conditions.push(`user_id = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}::task_status`);
    }

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortColumn = SORT_COLUMN_MAP[query.sortBy] ?? 'created_at';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (query.page - 1) * query.limit;

    params.push(query.limit);
    const limitParamIdx = params.length;
    params.push(offset);
    const offsetParamIdx = params.length;

    const dataSql = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST, created_at DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;
    const countSql = `SELECT COUNT(*)::int AS count FROM tasks ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query<TaskRecord>(dataSql, params),
      pool.query<{ count: number }>(countSql, params.slice(0, conditions.length)),
    ]);

    return { tasks: dataResult.rows, total: countResult.rows[0].count };
  },

  async update(id: string, input: UpdateTaskInput): Promise<TaskRecord | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    const fieldMap: Record<string, { value: unknown; cast?: string }> = {
      title: { value: input.title },
      description: { value: input.description },
      status: { value: input.status, cast: 'task_status' },
      priority: { value: input.priority, cast: 'task_priority' },
      due_date: { value: input.dueDate },
    };

    for (const [column, { value, cast }] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        params.push(value);
        fields.push(cast ? `${column} = $${params.length}::${cast}` : `${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const { rows } = await pool.query<TaskRecord>(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  },
};
