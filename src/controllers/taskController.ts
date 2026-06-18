import { Request, Response } from 'express';
import { TaskModel, TaskRecord } from '../models/taskModel';
import { ActivityLogModel } from '../models/activityLogModel';
import { AppError } from '../utils/AppError';
import { ListTasksQuery } from '../validators/taskValidators';
import { CloudinaryService } from '../services/cloudinaryService';
import { AttachmentModel } from '../models/attachmentModel';
import { uploadAttachmentsForTask } from '../services/attachmentService';

function getId(req: Request): string {
  return req.params.id;
}

function serializeTask(task: TaskRecord) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    userId: task.user_id,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

function isAdminViewingAll(req: Request): boolean {
  return req.user!.role === 'ADMIN' && req.query.scope === 'all';
}

async function assertOwnedOrAdmin(req: Request, task: TaskRecord | null): Promise<TaskRecord> {
  if (!task) {
    throw AppError.notFound('Task not found');
  }
  if (task.user_id !== req.user!.sub && req.user!.role !== 'ADMIN') {
    throw AppError.notFound('Task not found');
  }
  return task;
}

export async function createTask(req: Request, res: Response) {
  const task = await TaskModel.create(req.user!.sub, req.body);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  console.log("-------------------> ",req.body, req.files)
  const attachments = await uploadAttachmentsForTask({
    taskId: task.id,
    userId: req.user!.sub,
    files,
  });
  console.log("attachments", attachments)
  await ActivityLogModel.record(task.id, req.user!.sub, 'CREATED', { title: task.title, attachmentCount: attachments.length, });
  res.status(201).json({ task: serializeTask(task) });
}

export async function listTasks(req: Request, res: Response) {
  const query = (req as any).validatedQuery as ListTasksQuery;
  const scopeUserId = isAdminViewingAll(req) ? null : req.user!.sub;

  const { tasks, total } = await TaskModel.list(scopeUserId, query);

  res.status(200).json({
    tasks: tasks.map(serializeTask),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  });
}

export async function getTask(req: Request, res: Response) {
  const task = await TaskModel.findById(getId(req));
  const owned = await assertOwnedOrAdmin(req, task);
  res.status(200).json({ task: serializeTask(owned) });
}

export async function updateTask(req: Request, res: Response) {
  const existing = await TaskModel.findById(getId(req));
  await assertOwnedOrAdmin(req, existing);

  const updated = await TaskModel.update(getId(req), req.body);
  if (!updated) {
    throw AppError.notFound('Task not found');
  }

  await ActivityLogModel.record(updated.id, req.user!.sub, 'UPDATED', req.body);
  res.status(200).json({ task: serializeTask(updated) });
}

export async function deleteTask(req: Request, res: Response) {
  const existing = await TaskModel.findById(getId(req));
  await assertOwnedOrAdmin(req, existing);

  await TaskModel.delete(getId(req));
  res.status(204).send();
}

export async function getTaskActivity(req: Request, res: Response) {
  const task = await TaskModel.findById(getId(req));
  await assertOwnedOrAdmin(req, task);

  const logs = await ActivityLogModel.listForTask(getId(req));
  res.status(200).json({
    activity: logs.map((l) => ({
      id: l.id,
      action: l.action,
      changes: l.changes,
      userId: l.user_id,
      createdAt: l.created_at,
    })),
  });
}
