import pool from '../db/pool';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async create(email: string, passwordHash: string): Promise<UserRecord> {
    const { rows } = await pool.query<UserRecord>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, password_hash, role, created_at, updated_at`,
      [email, passwordHash]
    );
    return rows[0];
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1`,
      [email]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },
};
