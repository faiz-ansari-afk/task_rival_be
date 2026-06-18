import { Router } from 'express';
import {
  uploadTaskAttachments,
  listTaskAttachments,
  deleteTaskAttachment,
} from '../controllers/attachmentController';
import { requireAuth } from '../middleware/auth';
import { validateUuidParam } from '../middleware/validateUuidParam';
import { uploadAttachments } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';
import { config } from '../config/env';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(validateUuidParam('taskId'));

router.get('/', asyncHandler(listTaskAttachments));
router.post(
  '/',
  uploadAttachments.array('files', config.attachments.maxFilesPerUpload),
  asyncHandler(uploadTaskAttachments)
);
router.delete('/:attachmentId', validateUuidParam('attachmentId'), asyncHandler(deleteTaskAttachment));

export default router;
