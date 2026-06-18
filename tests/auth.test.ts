import request from 'supertest';
import { createApp } from '../src/app';
import pool from '../src/db/pool';

const app = createApp();

describe('Auth', () => {
  afterAll(async () => {
    await pool.end();
  });

  const credentials = { email: 'test-auth@example.com', password: 'password123' };

  it('signs up a new user with a hashed password and returns a token', async () => {
    const res = await request(app).post('/auth/signup').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: credentials.email, role: 'USER' });
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [
      credentials.email,
    ]);
    expect(rows[0].password_hash).not.toBe(credentials.password);
  });

  it('rejects signup with a duplicate email', async () => {
    const res = await request(app).post('/auth/signup').send(credentials);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects signup with an invalid email or short password', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const ok = await request(app).post('/auth/login').send(credentials);
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeDefined();

    const bad = await request(app)
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrongpassword' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');
  });
});
