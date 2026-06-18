import request from 'supertest';
import { createApp } from '../src/app';
import pool from '../src/db/pool';

const app = createApp();

async function signupAndLogin(email: string) {
  const res = await request(app).post('/auth/signup').send({ email, password: 'password123' });
  return { token: res.body.accessToken as string, userId: res.body.user.id as string };
}

describe('Tasks', () => {
  let aliceToken: string;
  let bobToken: string;
  let aliceTaskId: string;

  beforeAll(async () => {
    const alice = await signupAndLogin('alice-tasks@example.com');
    const bob = await signupAndLogin('bob-tasks@example.com');
    aliceToken = alice.token;
    bobToken = bob.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('rejects task creation without a valid auth token', async () => {
    const res = await request(app).post('/tasks').send({ title: 'No auth' });
    expect(res.status).toBe(401);
  });

  it('rejects task creation with a missing title', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ description: 'no title here' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a task and persists it with defaults', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Write tests', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      title: 'Write tests',
      status: 'TODO',
      priority: 'HIGH',
    });
    aliceTaskId = res.body.task.id;
  });

  it("prevents one user from reading, updating, or deleting another user's task", async () => {
    const get = await request(app)
      .get(`/tasks/${aliceTaskId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(get.status).toBe(404);

    const patch = await request(app)
      .patch(`/tasks/${aliceTaskId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: 'hijacked' });
    expect(patch.status).toBe(404);

    const del = await request(app)
      .delete(`/tasks/${aliceTaskId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(del.status).toBe(404);
  });

  it('allows the owner to update their own task', async () => {
    const res = await request(app)
      .patch(`/tasks/${aliceTaskId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('DONE');
  });

  it('supports filtering by status, searching by title, and sorting', async () => {
    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Urgent fix', priority: 'HIGH', status: 'TODO' });
    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Low priority chore', priority: 'LOW', status: 'TODO' });

    const filtered = await request(app)
      .get('/tasks?status=TODO')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.tasks.every((t: any) => t.status === 'TODO')).toBe(true);

    const searched = await request(app)
      .get('/tasks?search=Urgent')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(searched.body.tasks).toHaveLength(1);
    expect(searched.body.tasks[0].title).toBe('Urgent fix');

    const sorted = await request(app)
      .get('/tasks?sortBy=priority&sortOrder=asc&status=TODO')
      .set('Authorization', `Bearer ${aliceToken}`);
    const priorities = sorted.body.tasks.map((t: any) => t.priority);
    expect(priorities[0]).toBe('LOW');
  });

  it('paginates results', async () => {
    const res = await request(app)
      .get('/tasks?page=1&limit=1')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('deletes a task and returns 404 for subsequent reads', async () => {
    const del = await request(app)
      .delete(`/tasks/${aliceTaskId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/tasks/${aliceTaskId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(get.status).toBe(404);
  });

  it('returns 400 for a malformed task id and 404 for a well-formed but unknown id', async () => {
    const malformed = await request(app)
      .get('/tasks/not-a-real-uuid')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(malformed.status).toBe(400);

    const unknown = await request(app)
      .get('/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(unknown.status).toBe(404);
  });
});
