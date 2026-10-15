import { Service, Inject } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import type { PrismaClient } from '@/generated/prisma/client'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
  type NewAttachment,
} from '@/modules/attachments/attachment.repository'

@Service()
export class CreateAttachmentUseCase {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async execute(data: Omit<NewAttachment, 'uploaderId'>, uploaderId: string) {
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
}
