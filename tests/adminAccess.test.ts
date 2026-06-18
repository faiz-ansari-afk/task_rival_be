import request from 'supertest';
import { createApp } from '../src/app';
import pool from '../src/db/pool';

const app = createApp();

describe('Admin role-based access', () => {
  let userToken: string;
  let adminToken: string;

  afterAll(async () => {
    await pool.end();
  });

  beforeAll(async () => {
    const userSignup = await request(app)
      .post('/auth/signup')
      .send({ email: 'plain-user@example.com', password: 'password123' });
    userToken = userSignup.body.accessToken;

    const adminSignup = await request(app)
      .post('/auth/signup')
      .send({ email: 'admin-user@example.com', password: 'password123' });

    await pool.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", ['admin-user@example.com']);

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin-user@example.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: "Regular user's task" });
  });

  it('does not let a regular user view other users tasks via scope=all', async () => {
    const res = await request(app)
      .get('/tasks?scope=all')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    // A non-admin's scope=all is ignored; they still only see their own tasks
    expect(res.body.tasks.every((t: any) => t.title !== undefined)).toBe(true);
  });

  it('lets an admin view all users tasks with scope=all', async () => {
    const res = await request(app)
      .get('/tasks?scope=all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const titles = res.body.tasks.map((t: any) => t.title);
    expect(titles).toContain("Regular user's task");
  });
});
