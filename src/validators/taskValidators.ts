import { z } from 'zod';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const isoDate = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Must be a valid ISO date string' });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().trim().max(5000, 'Description is too long').optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: isoDate.optional().nullable(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(255, 'Title is too long'),
    description: z.string().trim().max(5000, 'Description is too long').nullable(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: isoDate.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().max(255).optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
