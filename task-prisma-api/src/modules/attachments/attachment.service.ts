import { Service, Inject } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import type { PrismaClient } from '@/generated/prisma/client'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
  type NewAttachment,
} from './attachment.repository'

@Service()
export class AttachmentService {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async create(data: Omit<NewAttachment, 'uploaderId'>, uploaderId: string) {
    const attachment = await this.repo.create({
      ...data,
      uploaderId,
    })

    // Increment attachment count on task
    await this.prisma.task.update({
      where: { id: data.taskId },
      data: { attachmentCount: { increment: 1 } },
    })

    return attachment
  }

  async delete(id: string) {
    const attachment = await this.repo.findById(id)
    if (!attachment) return

    await this.repo.delete(id)

    // Decrement attachment count on task (minimum 0)
    await this.prisma.task.update({
      where: { id: attachment.taskId },
      data: { attachmentCount: { decrement: 1 } },
    })
  }
}
