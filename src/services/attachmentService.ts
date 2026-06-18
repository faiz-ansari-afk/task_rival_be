import { AttachmentModel, AttachmentRecord } from '../models/attachmentModel';
import { CloudinaryService } from './cloudinaryService';

interface UploadAttachmentsParams {
    taskId: string;
    userId: string;
    files: Express.Multer.File[];
}

export async function uploadAttachmentsForTask({
    taskId,
    userId,
    files,
}: UploadAttachmentsParams): Promise<AttachmentRecord[]> {
    const uploaded: AttachmentRecord[] = [];
    console.log("file", files)
    for (const file of files) {
        const result = await CloudinaryService.uploadBuffer(
            file.buffer,
            file.originalname,
            file.mimetype
        );

        const record = await AttachmentModel.create({
            taskId,
            userId,
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
    console.log("uploaded", uploaded)
    return uploaded;
}