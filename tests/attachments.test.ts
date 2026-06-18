import request from 'supertest';
import { createApp } from '../src/app';
import pool from '../src/db/pool';

jest.mock('../src/services/cloudinaryService', () => ({
  CloudinaryService: {
    uploadBuffer: jest.fn().mockImplementation(async (_buffer: Buffer, originalName: string) => ({
      public_id: `task-manager-attachments/mock-${originalName}-${Date.now()}`,
      resource_type: 'raw',
      format: null,
      secure_url: `https://res.cloudinary.com/mock/raw/upload/mock-${originalName}`,
      width: undefined,
      height: undefined,
    })),
    deleteAsset: jest.fn().mockResolvedValue(undefined),
  },
}));

import { CloudinaryService } from '../src/services/cloudinaryService';

const app = createApp();

async function signupAndLogin(email: string) {
  const res = await request(app).post('/auth/signup').send({ email, password: 'password123' });
  return res.body.accessToken as string;
}

async function createTask(token: string, title = 'Task with attachments') {
  const res = await request(app).post('/tasks').set('Authorization', `Bearer ${token}`).send({ title });
  return res.body.task.id as string;
}

describe('Task attachments', () => {
  let aliceToken: string;
  let bobToken: string;
  let taskId: string;

  beforeAll(async () => {
    aliceToken = await signupAndLogin('alice-attachments@example.com');
    bobToken = await signupAndLogin('bob-attachments@example.com');
    taskId = await createTask(aliceToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('rejects an upload with no files', async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(400);
  });

  it('rejects a disallowed file type before ever calling Cloudinary', async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('files', Buffer.from('fake binary'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
    expect(CloudinaryService.uploadBuffer).not.toHaveBeenCalled();
  });

  it('uploads multiple files in one request and persists one row per file', async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('files', Buffer.from('hello world'), { filename: 'notes.txt', contentType: 'text/plain' })
      .attach('files', Buffer.from('fake png bytes'), { filename: 'screenshot.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.attachments).toHaveLength(2);
    expect(CloudinaryService.uploadBuffer).toHaveBeenCalledTimes(2);
    expect(res.body.attachments[0]).toMatchObject({ taskId, originalName: expect.any(String) });
  });

  it('lists attachments for a task the caller owns', async () => {
    const res = await request(app)
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.attachments.length).toBeGreaterThanOrEqual(2);
  });

  it("prevents another user from listing, uploading to, or deleting another user's task attachments", async () => {
    const list = await request(app)
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(list.status).toBe(404);

    const upload = await request(app)
      .post(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${bobToken}`)
      .attach('files', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(upload.status).toBe(404);
    expect(CloudinaryService.uploadBuffer).not.toHaveBeenCalled();

    const ownList = await request(app)
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`);
    const attachmentId = ownList.body.attachments[0].id;

    const del = await request(app)
      .delete(`/tasks/${taskId}/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(del.status).toBe(404);
  });

  it('deletes an attachment, removing it from Cloudinary and the database', async () => {
    const list = await request(app)
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`);
    const attachmentId = list.body.attachments[0].id;

    const del = await request(app)
      .delete(`/tasks/${taskId}/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(del.status).toBe(204);
    expect(CloudinaryService.deleteAsset).toHaveBeenCalledTimes(1);

    const after = await request(app)
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(after.body.attachments.find((a: { id: string }) => a.id === attachmentId)).toBeUndefined();
  });

  it('returns 404 for deleting an attachment that does not exist', async () => {
    const res = await request(app)
      .delete(`/tasks/${taskId}/attachments/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(404);
  });

  it('enforces the maximum number of attachments allowed per task', async () => {
    const freshTaskId = await createTask(aliceToken, 'Task for cap test');

    // The test env's MAX_ATTACHMENTS_PER_TASK is set low in setupEnv.ts.
    const firstBatch = await request(app)
      .post(`/tasks/${freshTaskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('files', Buffer.from('a'), { filename: 'a.txt', contentType: 'text/plain' })
      .attach('files', Buffer.from('b'), { filename: 'b.txt', contentType: 'text/plain' });
    expect(firstBatch.status).toBe(201);

    const overCap = await request(app)
      .post(`/tasks/${freshTaskId}/attachments`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('files', Buffer.from('c'), { filename: 'c.txt', contentType: 'text/plain' });
    expect(overCap.status).toBe(400);
  });
});
