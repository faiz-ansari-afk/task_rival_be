import { Router } from 'express';
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  getTaskActivity,
} from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { validateUuidParam } from '../middleware/validateUuidParam';
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from '../validators/taskValidators';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadAttachments } from '../middleware/upload';
import { config } from '../config/env';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  uploadAttachments.array(
    'files',
    config.attachments.maxFilesPerUpload
  ),
  validateBody(createTaskSchema),
  asyncHandler(createTask)
);
router.get('/', validateQuery(listTasksQuerySchema), asyncHandler(listTasks));
router.get('/:id', validateUuidParam('id'), asyncHandler(getTask));
router.patch('/:id', validateUuidParam('id'), validateBody(updateTaskSchema), asyncHandler(updateTask));
router.delete('/:id', validateUuidParam('id'), asyncHandler(deleteTask));
router.get('/:id/activity', validateUuidParam('id'), asyncHandler(getTaskActivity));

export default router;
