import { Request, Response } from 'express';
import { TaskModel } from '../models/taskModel';
import { AttachmentModel, AttachmentRecord } from '../models/attachmentModel';
import { ActivityLogModel } from '../models/activityLogModel';
import { CloudinaryService } from '../services/cloudinaryService';
import { AppError } from '../utils/AppError';
import { config } from '../config/env';

function serializeAttachment(a: AttachmentRecord) {
  return {
    id: a.id,
    taskId: a.task_id,
    userId: a.user_id,
    url: a.url,
    originalName: a.original_name,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    resourceType: a.resource_type,
    format: a.format,
    width: a.width,
    height: a.height,
    createdAt: a.created_at,
  };
}

async function loadOwnedTask(req: Request) {
  const task = await TaskModel.findById(req.params.taskId);
  if (!task) {
    throw AppError.notFound('Task not found');
  }
  if (task.user_id !== req.user!.sub && req.user!.role !== 'ADMIN') {
    throw AppError.notFound('Task not found');
  }
  return task;
}

export async function uploadTaskAttachments(req: Request, res: Response) {
  const task = await loadOwnedTask(req);

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw AppError.badRequest('No files were provided');
  }

  const existingCount = await AttachmentModel.countForTask(task.id);
  if (existingCount + files.length > config.attachments.maxFilesPerTask) {
    throw AppError.badRequest(
      `This task can have at most ${config.attachments.maxFilesPerTask} attachments ` +
      `(it already has ${existingCount}, and you're trying to add ${files.length}).`
    );
  }

  const uploaded: AttachmentRecord[] = [];
  for (const file of files) {
    const result = await CloudinaryService.uploadBuffer(file.buffer, file.originalname, file.mimetype);
    const record = await AttachmentModel.create({
      taskId: task.id,
      userId: req.user!.sub,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format ?? null,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: result.secure_url,
      width: result.width ?? null,
      height: result.height ?? null,
    });
    uploaded.push(record);
  }

  await ActivityLogModel.record(task.id, req.user!.sub, 'ATTACHMENT_ADDED', {
    files: uploaded.map((a) => a.original_name),
  });

  res.status(201).json({ attachments: uploaded.map(serializeAttachment) });
}

export async function listTaskAttachments(req: Request, res: Response) {
  const task = await loadOwnedTask(req);
  const attachments = await AttachmentModel.listForTask(task.id);
  res.status(200).json({ attachments: attachments.map(serializeAttachment) });
}

export async function deleteTaskAttachment(req: Request, res: Response) {
  const task = await loadOwnedTask(req);

  const attachment = await AttachmentModel.findById(req.params.attachmentId);
  if (!attachment || attachment.task_id !== task.id) {
    throw AppError.notFound('Attachment not found');
  }

  await CloudinaryService.deleteAsset(attachment.public_id, attachment.resource_type);
  await AttachmentModel.delete(attachment.id);

  await ActivityLogModel.record(task.id, req.user!.sub, 'ATTACHMENT_REMOVED', {
    file: attachment.original_name,
  });

  res.status(204).send();
}
